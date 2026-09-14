import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'latest.json')
    const raw = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(raw)
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    })
  } catch {
    return NextResponse.json(
      { version: null, downloadUrl: null, message: 'No release available yet' },
      { status: 404 }
    )
  }
}
