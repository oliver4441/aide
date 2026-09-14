import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch(
      'https://api.github.com/repos/marvel-254/aide/releases/latest',
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    )

    if (!res.ok) {
      return NextResponse.json(
        { version: null, downloadUrl: null, message: 'No release available yet' },
        { status: 404 }
      )
    }

    const release = await res.json()
    const apk = release.assets?.find((a: { name: string }) =>
      a.name.endsWith('.apk')
    )

    return NextResponse.json(
      {
        version: release.tag_name?.replace(/^v/, '').replace(/\+\d+$/, ''),
        versionCode: parseInt(release.tag_name?.match(/\+(\d+)$/)?.[1] || '0'),
        downloadUrl: apk?.browser_download_url || null,
        releaseDate: release.published_at,
        releaseUrl: release.html_url,
      },
      {
        headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
      }
    )
  } catch {
    return NextResponse.json(
      { version: null, downloadUrl: null, message: 'No release available yet' },
      { status: 404 }
    )
  }
}
