#!/usr/bin/env bash
#
# Publish an Aide release.
#
#   scripts/publish-release.sh v1.0.3
#   scripts/publish-release.sh desktop-v1.0.1
#   scripts/publish-release.sh v1.0.3 --dry-run
#
# Why this exists: it is the guarded path to a release — clean tree, unused tag,
# signing secrets present, then wait for the run and verify the published asset.
#
# Tag pushes DO start the release workflows again (v1.0.8, 2026-10-30, HANDOFF
# §4.5b), so this no longer dispatches by hand up front. It waits for the run the
# tag itself started and only falls back to `gh workflow run --ref <tag>` if no
# run appears — the two must never both fire, or two runs race to publish the
# same release.
#
# Android releases are normally published automatically after a successful
# Android CI run on master. This script remains the explicit, guarded path for
# maintainers who want to publish a chosen version manually.
#
# It refuses to run on a dirty tree, on an existing tag, and — for Android — on a
# tag whose version disagrees with android/app/build.gradle.kts, because that
# mismatch is what made every APK report itself as 1.0.0 while GitHub said
# v1.0.1.
#
set -euo pipefail

REPO="${AIDE_REPO:-oliver4441/aide}"
DRY_RUN=0
SKIP_VERSION_CHECK=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --skip-version-check) SKIP_VERSION_CHECK=1 ;;
    -*) echo "unknown option: $arg" >&2; exit 2 ;;
    *) TAG="$arg" ;;
  esac
done

[ -n "${TAG:-}" ] || { echo "usage: scripts/publish-release.sh <tag> [--dry-run] [--skip-version-check]" >&2; exit 2; }

die() { echo "error: $*" >&2; exit 1; }
say() { printf '\n==> %s\n' "$*"; }

# ---- pick the pipeline from the tag -----------------------------------------
case "$TAG" in
  desktop-v*)   WORKFLOW="release-desktop.yml"   FAMILY="desktop" ;;
  v*)           WORKFLOW="android-release.yml"    FAMILY="android" ;;
  *) die "'$TAG' is neither a v* nor a desktop-v* tag" ;;
esac

# ---- preconditions -----------------------------------------------------------
DIRTY=$(git status --porcelain)
[ -z "$DIRTY" ] || die "working tree is not clean; commit or stash first:
$DIRTY"

git rev-parse --git-dir >/dev/null 2>&1 || die "not inside a git repository"

if git rev-parse "refs/tags/$TAG" >/dev/null 2>&1; then
  die "tag '$TAG' already exists locally; pick a new version"
fi
if git ls-remote --exit-code --tags origin "refs/tags/$TAG" >/dev/null 2>&1; then
  die "tag '$TAG' already exists on origin"
fi

VERSION="${TAG#desktop-}"
VERSION="${VERSION#v}"

if [ "$FAMILY" = "android" ] && [ "$SKIP_VERSION_CHECK" -eq 0 ]; then
  # The tag is the source of truth. android-release.yml derives versionName and
  # versionCode from it and passes them to Gradle as -P overrides, so a stale
  # value in build.gradle.kts can no longer produce a mislabelled APK. What is
  # left here is a heads-up, not a gate.
  GRADLE_NAME=$(grep -oE 'aideVersionName"\)\.getOrElse\("[^"]+"' android/app/build.gradle.kts \
    | grep -oE '[0-9][^"]*' || true)
  GRADLE_CODE=$(grep -oE 'aideVersionCode"\)\.getOrElse\("[0-9]+"' android/app/build.gradle.kts \
    | grep -oE '[0-9]+' || true)
  if [ -n "$GRADLE_NAME" ] && [ "$GRADLE_NAME" != "$VERSION" ]; then
    say "note: build.gradle.kts falls back to $GRADLE_NAME locally, but this release will be built as $VERSION from the tag"
  else
    say "Android version: $VERSION (versionCode ${GRADLE_CODE:-from tag})"
  fi

  MISSING=""
  for s in ANDROID_KEYSTORE_BASE64 ANDROID_STORE_PASSWORD ANDROID_KEY_ALIAS ANDROID_KEY_PASSWORD; do
    gh secret list --repo "$REPO" 2>/dev/null | cut -f1 | grep -qx "$s" || MISSING="$MISSING $s"
  done
  [ -z "$MISSING" ] || die "signing secrets are missing from $REPO:$MISSING
    An APK built without them is unsigned, which is how app-debug.apk ended up
    on /downloads. See ~/.aide/README.md."
  say "Signing secrets present"
else
  ELECTRON_VERSION=$(node -p "require('./electron/package.json').version" 2>/dev/null || echo "")
  if [ "$FAMILY" = "desktop" ] && [ "$SKIP_VERSION_CHECK" -eq 0 ]; then
    [ "$ELECTRON_VERSION" = "$VERSION" ] || die "tag says $VERSION but electron/package.json says ${ELECTRON_VERSION:-<unreadable>}
    Bump it first, or re-run with --skip-version-check."
    say "Desktop version check: electron/package.json is $ELECTRON_VERSION"
  fi
fi

# ---- plan --------------------------------------------------------------------
say "Release plan"
echo "  tag        $TAG"
echo "  family     $FAMILY"
echo "  workflow   $WORKFLOW"
echo "  repo       $REPO"

if [ "$DRY_RUN" -eq 1 ]; then
  say "Dry run — stopping before the tag is pushed"
  exit 0
fi

# ---- tag ---------------------------------------------------------------------
say "Pushing tag $TAG"
git tag -a "$TAG" -m "Aide $TAG"
git push origin "refs/tags/$TAG"

# The newest run for this tag, if one exists yet.
find_run() {
  gh run list --repo "$REPO" --workflow "$WORKFLOW" --limit 20 \
    --json databaseId,headBranch \
    --jq "[.[] | select(.headBranch == \"$TAG\")][0].databaseId // empty" 2>/dev/null || true
}

wait_for_run() {   # $1 = attempts, $2 = seconds between them
  local run=""
  for _ in $(seq 1 "$1"); do
    sleep "$2"
    run=$(find_run)
    [ -n "$run" ] && { printf '%s' "$run"; return 0; }
  done
  return 1
}

# §4.5b: the tag itself starts the workflow. Give GitHub a minute before
# assuming the old "tag pushes do nothing" behaviour is back.
say "Waiting for the tag-triggered run"
if RUN=$(wait_for_run 12 5); then
  say "Run $RUN started from the tag push"
else
  say "No run after 60s — dispatching $WORKFLOW against the tag"
  if [ "$FAMILY" = "android" ]; then
    gh workflow run "$WORKFLOW" --repo "$REPO" --ref "$TAG" -f version="$VERSION" >/dev/null
  else
    gh workflow run "$WORKFLOW" --repo "$REPO" --ref "$TAG" >/dev/null
  fi
  RUN=$(wait_for_run 30 5) || die "no run appeared for $TAG after 210s — check the Actions tab"
fi

say "Watching run $RUN"
if ! gh run watch "$RUN" --repo "$REPO" --exit-status >/dev/null 2>&1; then
  echo "run failed: https://github.com/$REPO/actions/runs/$RUN" >&2
  exit 1
fi

# ---- verify ------------------------------------------------------------------
say "Verifying the published release"
if ! gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
  die "the run succeeded but no release exists for $TAG
    Check whether the publish step was skipped."
fi

gh release view "$TAG" --repo "$REPO" \
  --json tagName,name,assets \
  --jq '"  \(.name)  [\(.tagName)]
" + ([.assets[] | "    \(.name)  \(.size) bytes"] | join("\n"))'

# Checksums are written by the workflow's checksums job; it commits to master.
say "Done. Checksums should arrive on master within a minute."
echo "  https://github.com/$REPO/releases/tag/$TAG"
