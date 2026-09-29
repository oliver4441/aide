"use client"

import { useEffect, useState } from 'react'
import { getDeviceType, getDeviceLabel, getDownloadUrl, isAndroid } from '@/lib/device'

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
  const deviceLabel = getDeviceLabel()

  useEffect(() => {
    fetch('/api/latest-release')
      .then((res) => res.json())
      .then((data: ReleaseInfo) => {
        if (data.version && data.downloadUrl) setRelease(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // PWA users get download button with device recommendation
  const handleClick = (e: React.MouseEvent) => {
    // For Android users, recommend APK download
    if (isAndroid() && release) {
      return
    }
    // For other users, suggest PWA install
    if (deviceLabel !== 'Android' && deviceLabel !== 'iOS') {
      e.preventDefault()
      alert(`Download Aide for ${deviceLabel}:\n\nWeb/PWA: https://aide-395ga290s-twistedoliver211fs-1271.vercel.app\n\nDesktop: Check GitHub Releases for ${deviceLabel} installer`)
    }
  }

  if (loading || !release) return null

  const isAndroidUser = isAndroid()

  return (
    <a
      href={release.downloadUrl}
      onClick={handleClick}
      className={`font-semibold px-6 py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm ${
        isAndroidUser 
          ? 'bg-success text-on-success hover:bg-success/90' 
          : 'border border-outline-variant text-on-surface hover:bg-surface-container-low'
      }`}
      download={isAndroidUser ? true : undefined}
    >
      {isAndroidUser && (
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
      )}
      {isAndroidUser 
        ? `Download Android App (v${release.version})`
        : `Download for ${deviceLabel}`}
    </a>
  )
}
