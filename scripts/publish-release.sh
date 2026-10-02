#!/usr/bin/env bash
#
# Publish an Aide release.
#
#   scripts/publish-release.sh v1.0.3
#   scripts/publish-release.sh desktop-v1.0.1
#   scripts/publish-release.sh v1.0.3 --dry-run
#
# Why this exists: as of 2026-10-02, pushing a tag to this repository does not
# start any workflow (see HANDOFF.md §4.5b). A tag push produces no run at all,
# so `git push origin v1.0.3` silently does nothing. This script pushes the tag
# anyway — the tag has to exist for a release to hang off — and then dispatches
# the workflow *against that tag*. With `--ref <tag>` the run's `github.ref` is
# `refs/tags/<tag>`, so the steps gated on
# `startsWith(github.ref, 'refs/tags/')` behave exactly as they would on a real
# tag push. That is how v1.0.2 was published.
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
  GRADLE_NAME=$(grep -oE 'versionName\s*=\s*"[^"]+"' android/app/build.gradle.kts | grep -oE '"[^"]+"' | tr -d '"')
  GRADLE_CODE=$(grep -oE 'versionCode\s*=\s*[0-9]+' android/app/build.gradle.kts | grep -oE '[0-9]+')
  [ -n "$GRADLE_NAME" ] || die "could not read versionName from android/app/build.gradle.kts"
  [ "$GRADLE_NAME" = "$VERSION" ] || die "tag says $VERSION but android/app/build.gradle.kts says $GRADLE_NAME
    Android builds its APK from Gradle, so the tag must match:
      sed -i 's/versionName = \"[^\"]*\"/versionName = \"$VERSION\"/' android/app/build.gradle.kts
    Or re-run with --skip-version-check if you know what you are doing."
  say "Android version check: $GRADLE_NAME (versionCode $GRADLE_CODE) matches the tag"

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

# Tag pushes do not trigger workflows on this repo (§4.5b), so dispatch by hand.
say "Dispatching $WORKFLOW against the tag"
START=$(date -u +%s)
if [ "$FAMILY" = "android" ]; then
  gh workflow run "$WORKFLOW" --repo "$REPO" --ref "$TAG" -f version="$VERSION" >/dev/null
else
  gh workflow run "$WORKFLOW" --repo "$REPO" --ref "$TAG" >/dev/null
fi

say "Waiting for the run to start"
RUN=""
for _ in $(seq 1 30); do
  sleep 5
  RUN=$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --limit 10 \
        --json databaseId,headBranch,createdAt \
        --jq "[.[] | select(.headBranch == \"$TAG\")][0].databaseId" 2>/dev/null || true)
  [ -n "$RUN" ] && [ "$RUN" != "null" ] && break
  RUN=""
done
[ -n "$RUN" ] || die "no run appeared for $TAG after 150s — check the Actions tab"

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
