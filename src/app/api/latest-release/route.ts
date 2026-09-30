import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const REPO = "oliver4441/aide";

/**
 * Picks the best APK asset from a release: prefer a proper release build over a
 * debug build, and the signing-aware name over the generic CI copy.
 */
function pickApk(assets: any[] = []) {
  const apks = assets.filter((a) => a.name?.toLowerCase().endsWith(".apk"));
  if (apks.length === 0) return null;

  const isDebug = (a: any) => a.name.toLowerCase().includes("debug");
  return apks.find((a) => !isDebug(a)) ?? apks[0];
}

export async function GET() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { version: null, downloadUrl: null, message: "No release available yet" },
        { status: 404 }
      );
    }

    const release = await res.json();
    const apk = pickApk(release.assets);

    return NextResponse.json(
      {
        version: release.tag_name?.replace(/^v/, "").replace(/\+\d+$/, ""),
        versionCode: parseInt(release.tag_name?.match(/\+(\d+)$/)?.[1] || "0", 10),
        tag: release.tag_name ?? null,
        downloadUrl: apk?.browser_download_url ?? null,
        apkName: apk?.name ?? null,
        sizeBytes: apk?.size ?? null,
        releaseDate: release.published_at ?? null,
        releaseUrl: release.html_url ?? null,
        notes: release.body ?? null,
      },
      { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }
    );
  } catch {
    return NextResponse.json(
      { version: null, downloadUrl: null, message: "No release available yet" },
      { status: 404 }
    );
  }
}
