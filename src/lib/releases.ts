import { parseVersion, parseVersionCode } from "@/lib/releaseVersion";

/**
 * A unified release record that covers both the Android APK family and the
 * Desktop (Capacitor/Electron) family. Used for the changelog section and
 * the /downloads page.
 */
export interface UnifiedRelease {
  /** Semantic version, e.g. "1.0.14" (Android) or "1.0.0" (Desktop). */
  version: string | null;
  /** Android's monotonically increasing versionCode. null for Desktop. */
  versionCode: number | null;
  /** The raw GitHub tag, e.g. "v1.0.14+1014" or "desktop-v1.0.0". */
  tag: string | null;
  /** Human-readable release title from GitHub, e.g. "Aide v1.0.14 (1014)". */
  name: string | null;
  /** Release body (Markdown) — the canonical changelog. */
  notes: string | null;
  /** Whether this is a pre-release. */
  prerelease: boolean;
  /** ISO timestamp of publication. */
  publishedAt: string | null;
  /** URL of the GitHub release page. */
  url: string | null;
  /** Downloadable artifacts attached to the release. */
  assets: ReleaseAsset[];
  /** Family discriminator. */
  family: "android" | "desktop";
}

/** A single downloadable file attached to a release. */
export interface ReleaseAsset {
  name: string;
  sizeBytes: number;
  downloadUrl: string;
}

/** GitHub releases are fetched from the canonical upstream repo. */
const REPO = "oliver4441/aide";
const GH_RELEASES = `https://api.github.com/repos/${REPO}/releases`;

/**
 * Fetch *all* releases from GitHub, newest first, and shape them into a
 * unified list with family tagging.
 *
 * This is the single source for /downloads, the landing changelog block,
 * and any other surface that needs a combined history.
 */
export async function fetchAllReleases(): Promise<UnifiedRelease[]> {
  try {
    const res = await fetch(GH_RELEASES, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const raw = await res.json();
    const releases = Array.isArray(raw) ? raw : [];

    return releases
      .filter((r: any) => r && !r.draft)
      .map((r: any) => {
        const tag = r.tag_name ?? null;
        const isDesktop = /^desktop-v/i.test(tag ?? "");
        const family = isDesktop ? "desktop" : "android";

        const assets: ReleaseAsset[] = (r.assets ?? []).map((a: any) => ({
          name: a.name,
          sizeBytes: a.size,
          downloadUrl: a.browser_download_url,
        }));

        return {
          version: parseVersion(tag),
          versionCode: parseVersionCode(tag, r.name),
          tag,
          name: r.name ?? tag ?? null,
          notes: r.body ?? null,
          prerelease: Boolean(r.prerelease),
          publishedAt: r.published_at ?? null,
          url: r.html_url ?? null,
          assets,
          family,
        };
      });
  } catch {
    return [];
  }
}

/**
 * Fetch only the newest N releases (across both families) for a compact
 * "What's new" block on the landing page.
 */
export async function fetchRecentReleases(limit = 5): Promise<UnifiedRelease[]> {
  const all = await fetchAllReleases();
  return all.slice(0, limit);
}

/**
 * Format bytes into a human string.
 */
export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/**
 * Format ISO date to a human string.
 */
export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Shorten a SHA-256 for display.
 */
export function shortHash(hash?: string): string {
  if (!hash) return "checksum unavailable";
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
}