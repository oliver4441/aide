import { NextResponse } from "next/server";
import { fetchLatestDesktopRelease } from "@/lib/desktop";

export const dynamic = "force-dynamic";

export async function GET() {
  const release = await fetchLatestDesktopRelease();

  if (!release) {
    return NextResponse.json(
      { version: null, downloadUrl: null, message: "No desktop release available yet" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    release,
    { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }
  );
}