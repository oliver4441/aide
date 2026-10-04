import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-dynamic";

const REPO = "oliver4441/aide";

/**
 * A stable "give me the current APK" URL.
 *
 * Download buttons point here rather than straight at a versioned asset, so
 * links keep working across releases. It also keeps the anchor same-origin,
 * which is what makes the `download` attribute fire instead of being ignored
 * for a cross-origin URL the way it is with GitHub's asset CDN.
 *
 * The redirect target is the Vercel Blob copy when public/releases.json has one,
 * and the GitHub release asset otherwise.
 */
export async function GET() {
  const target = await resolveApkUrl();
  if (!target) {
    return NextResponse.json(
      { message: "No Android release available yet" },
      { status: 404 }
    );
  }

  // 302, not 307/308: the target moves with every release, so this must not be
  // cached as a permanent redirect.
  return NextResponse.redirect(target, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}

async function resolveApkUrl(): Promise<URL | null> {
  try {
    const path = join(process.cwd(), "public", "releases.json");
    const raw = JSON.parse(await readFile(path, "utf8"));
    const latest = raw?.latest;
    if (latest?.family === "android" && latest.url) return new URL(latest.url);
  } catch {
    // fall through to GitHub
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=20`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;

    const raw = await res.json();
    const releases = Array.isArray(raw) ? raw : [];
    for (const release of releases) {
      const assets: any[] = release?.assets ?? [];
      const apks = assets.filter((a) => a.name?.toLowerCase().endsWith(".apk"));
      const apk = apks.find((a) => !a.name.toLowerCase().includes("debug")) ?? apks[0];
      if (apk?.browser_download_url) return new URL(apk.browser_download_url);
    }
    return null;
  } catch {
    return null;
  }
}