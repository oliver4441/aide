import { NextResponse } from "next/server";
import { parseVersion, parseVersionCode } from "@/lib/releaseVersion";

export const dynamic = "force-dynamic";

const REPO = "oliver4441/aide";

/** All releases with their assets, newest first — powers the /downloads page. */
export async function GET() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ releases: [] }, { status: 404 });
    }

    const raw = await res.json();
    const releases = (Array.isArray(raw) ? raw : [])
      .map((r: any) => ({
        tag: r.tag_name ?? null,
        version: parseVersion(r.tag_name),
        versionCode: parseVersionCode(r.tag_name, r.name),
        name: r.name ?? r.tag_name ?? null,
        notes: r.body ?? null,
        prerelease: Boolean(r.prerelease),
        publishedAt: r.published_at ?? null,
        url: r.html_url ?? null,
        assets: (r.assets ?? []).map((a: any) => ({
          name: a.name,
          sizeBytes: a.size,
          downloadUrl: a.browser_download_url,
        })),
      }))
      .filter((r: any) => r.assets.length > 0);

    return NextResponse.json(
      { releases },
      { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }
    );
  } catch {
    return NextResponse.json({ releases: [] }, { status: 404 });
  }
}
