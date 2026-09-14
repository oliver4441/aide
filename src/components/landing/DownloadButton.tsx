"use client"

import { useEffect, useState } from 'react'

interface ReleaseInfo {
  version: string
  versionCode: number
  downloadUrl: string
  releaseDate: string
  releaseUrl: string
}

export default function DownloadButton() {
  const [release, setRelease] = useState<ReleaseInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/latest-release')
      .then((res) => res.json())
      .then((data: ReleaseInfo) => {
        if (data.version && data.downloadUrl) setRelease(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !release) return null

  return (
    <a
      href={release.downloadUrl}
      className="bg-success text-on-success font-semibold px-6 py-4 rounded-xl hover:bg-success/90 transition-colors flex items-center justify-center gap-2 text-sm"
      download
    >
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      Download Android App (v{release.version})
    </a>
  )
}
