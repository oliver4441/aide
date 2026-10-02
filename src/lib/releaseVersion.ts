/**
 * Turning a release tag into something we can show a human.
 *
 * Two client families share this repository, so tags come in three shapes:
 *
 *   v1.0.2           Android, no build number in the tag
 *   v1.0.0+1         Android, with an explicit build number
 *   desktop-v1.0.0   the Electron desktop builds
 *
 * Both release routes used to inline `replace(/^v/, "").replace(/\+\d+$/, "")`,
 * which left the `desktop-` namespace attached and rendered "vdesktop-v1.0.0"
 * on /downloads. And they reported `versionCode: 0` for any tag without a `+N`
 * suffix, which looks like data but is a fabrication — the APK for `v1.0.2`
 * really is build 2. A field that invents a value is worse than one that says
 * it does not know.
 */

/** The display version: `desktop-v1.0.0` -> `1.0.0`, `v1.0.0+1` -> `1.0.0`. */
export function parseVersion(tag: string | null | undefined): string | null {
  if (!tag) return null;
  return tag.replace(/^desktop-v/i, "").replace(/^v/i, "").replace(/\+\d+$/, "");
}

/**
 * Android's monotonic build number.
 *
 * The `+N` tag suffix is the documented convention and wins when present.
 * Failing that, android-release.yml names the release "Aide v1.0.2 (2)" with
 * the Gradle versionCode it actually built, so the parenthesised number is
 * trustworthy. Returns null when neither is available — only the APK family
 * has a versionCode, and the desktop releases have none.
 */
export function parseVersionCode(
  tag: string | null | undefined,
  releaseName?: string | null
): number | null {
  const suffix = tag?.match(/\+(\d+)$/);
  if (suffix) return Number.parseInt(suffix[1], 10);

  const named = releaseName?.match(/\((\d+)\)/);
  if (named) return Number.parseInt(named[1], 10);

  return null;
}
