import { NextResponse } from "next/server";
import { fetchRecentReleases } from "@/lib/releases";

export const dynamic = "force-dynamic";

/**
 * Lightweight changelog feed for the landing page "What's new" block.
 *
 * Returns the newest few releases (across both the Android and Desktop
 * families) with their notes, so the landing page can render an up-to-date
 * changelog without touching GitHub directly in the browser.
 */
export async function GET() {
  const releases = await fetchRecentReleases(5);

  return NextResponse.json(
    { releases },
    { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }
  );
}