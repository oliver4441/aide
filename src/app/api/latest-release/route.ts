import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseVersion, parseVersionCode } from "@/lib/releaseVersion";

export const dynamic = "force-dynamic";

const REPO = "oliver4441/aide";

type MirroredRelease = {
  tag: string;
  version: string;
  family: string;
  file: string;
  url: string;
  sizeBytes: number;
  sha256: string;
  publishedAt: string;
};

/**
 * Reads public/releases.json, which CI writes after each release once the
 * asset has been mirrored to Vercel Blob.
 *
 * This is preferred over the GitHub API because the GitHub asset URL is
 * cross-origin: the `download` attribute on the anchor is ignored for it, so
 * users land on GitHub's asset page before the file starts. A same-origin URL
 * gives a real one-click download.
 */
async function readMirroredRelease(): Promise<MirroredRelease | null> {
  try {
    const path = join(process.cwd(), "public", "releases.json");
    const raw = JSON.parse(await readFile(path, "utf8"));
    const latest = raw?.latest;
    if (!latest?.url || latest.family !== "android") return null;
    return latest as MirroredRelease;
  } catch {
    // No manifest yet, or it is mid-deploy. The GitHub API is the fallback.
    return null;
  }
}

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
    // Prefer our own copy on Vercel Blob when there is one.
    const mirrored = await readMirroredRelease();
    if (mirrored) {
      return NextResponse.json(
        {
          version: parseVersion(mirrored.tag) ?? mirrored.version,
          versionCode: parseVersionCode(mirrored.tag, mirrored.version),
          tag: mirrored.tag,
          downloadUrl: mirrored.url,
          apkName: mirrored.file,
          sizeBytes: mirrored.sizeBytes ?? null,
          sha256: mirrored.sha256 ?? null,
          releaseDate: mirrored.publishedAt ?? null,
          releaseUrl: `https://github.com/${REPO}/releases/tag/${mirrored.tag}`,
          notes: null,
          mirrored: true,
        },
        { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }
      );
    }
    // Not /releases/latest: that is simply the newest release of any kind, and
    // the desktop family publishes independently. The moment a desktop release
    // goes out after an Android one, "latest" stops being an Android build and
    // the download button disappears even though a signed APK is right there.
    // Ask for the list and pick the newest release that actually ships an APK.
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=20`, {
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

    const raw = await res.json();
    const releases = Array.isArray(raw) ? raw : [];

    let release: any = null;
    let apk: any = null;
    for (const candidate of releases) {
      if (candidate?.draft) continue;
      const picked = pickApk(candidate.assets);
      if (picked) {
        release = candidate;
        apk = picked;
        break;
      }
    }

    if (!release) {
      return NextResponse.json(
        { version: null, downloadUrl: null, message: "No Android release available yet" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        version: parseVersion(release.tag_name),
        versionCode: parseVersionCode(release.tag_name, release.name),
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
