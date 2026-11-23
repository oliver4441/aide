import { parseVersion } from "@/lib/releaseVersion";

/** A single published artifact on a GitHub desktop release. */
export interface DesktopAsset {
  name: string;
  sizeBytes: number;
  downloadUrl: string;
}

/** The newest published desktop (Capacitor/Electron) release, if any. */
export interface DesktopReleaseInfo {
  version: string | null;
  tag: string | null;
  name: string | null;
  notes: string | null;
  prerelease: boolean;
  publishedAt: string | null;
  url: string | null;
  assets: DesktopAsset[];
}

/** GitHub releases are fetched from the canonical upstream repo. */
const REPO = "oliver4441/aide";

const GH_RELEASES = `https://api.github.com/repos/${REPO}/releases`;

/** Desktop release tags live in a dedicated namespace so they never collide
 *  with Android's `v*` tags. */
const DESKTOP_TAG_RE = /^desktop-v/i;

/**
 * Picks the newest desktop release that actually ships a binary.
 *
 * The GitHub "latest" endpoint is not safe here: Android and desktop publish
 * independently, so `/releases/latest` can return an Android build after a
 * desktop one (and vice-versa). We list and pick the newest release whose tag
 * is in the `desktop-v*` namespace and has at least one downloadable asset.
 */
export async function fetchLatestDesktopRelease(): Promise<DesktopReleaseInfo | null> {
  try {
    const res = await fetch(GH_RELEASES, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const raw = await res.json();
    const releases = Array.isArray(raw) ? raw : [];

    const latest = releases.find(
      (r: any) =>
        r &&
        !r.draft &&
        DESKTOP_TAG_RE.test(r.tag_name ?? "") &&
        Array.isArray(r.assets) &&
        r.assets.length > 0
    );

    if (!latest) return null;

    return {
      version: parseVersion(latest.tag_name),
      tag: latest.tag_name ?? null,
      name: latest.name ?? latest.tag_name ?? null,
      notes: latest.body ?? null,
      prerelease: Boolean(latest.prerelease),
      publishedAt: latest.published_at ?? null,
      url: latest.html_url ?? null,
      assets: (latest.assets ?? []).map((a: any) => ({
        name: a.name,
        sizeBytes: a.size,
        downloadUrl: a.browser_download_url,
      })),
    };
  } catch {
    return null;
  }
}

/**
 * The single best desktop artifact for the visitor's OS.
 *
 * Windows gets the NSIS installer (`*.exe`), macOS the `.dmg`, and Linux the
 * `.AppImage` (works on any distro without installation) with the `.deb` as a
 * fallback. Returns null when nothing matches.
 */
export function pickDesktopAssetForOs(
  release: DesktopReleaseInfo | null,
  os: "windows" | "macos" | "linux"
): DesktopAsset | null {
  if (!release || release.assets.length === 0) return null;

  const lower = (n: string) => n.toLowerCase();
  const pick = (pred: (name: string) => boolean): DesktopAsset | null =>
    release.assets.find((a) => pred(lower(a.name))) ?? null;

  if (os === "windows") {
    // Prefer the installer; fall back to any exe.
    return pick((n) => n.endsWith(".exe") && /setup|installer/.test(n)) ?? pick((n) => n.endsWith(".exe"));
  }

  if (os === "macos") {
    // Prefer universal x64 dmg, then any dmg; fall back to the mac zip.
    return (
      pick((n) => n.endsWith(".dmg") && !n.includes("arm64")) ??
      pick((n) => n.endsWith(".dmg")) ??
      pick((n) => n.endsWith("-mac.zip") || (n.endsWith(".zip") && n.includes("mac")))
    );
  }

  // Linux: AppImage first (no install needed), then deb.
  return (
    pick((n) => n.endsWith(".AppImage") && !n.includes("arm64")) ??
    pick((n) => n.endsWith(".AppImage")) ??
    pick((n) => n.endsWith(".deb") && !n.includes("arm64")) ??
    pick((n) => n.endsWith(".deb"))
  );
}
