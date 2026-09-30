"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { fetchLatestRelease, getRecommendedBuild, getDeviceLabel, type ReleaseInfo } from "@/lib/device";

export default function DownloadButton() {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetchLatestRelease()
      .then(setRelease)
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // Render nothing until we know what this device should be offered.
  if (!ready) return null;

  const build = getRecommendedBuild(release);
  const isApk = build.kind === "apk";
  const isSoon = build.kind === "coming-soon";

  // Android APK: hand the file straight to the device with a download
  // attribute so it installs rather than opening a GitHub release page.
  if (isApk) {
    return (
      <a
        href={build.href}
        download={release?.apkName ?? true}
        className="font-semibold px-6 py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm bg-success text-on-surface hover:bg-success/90"
      >
        <Download className="w-5 h-5" />
        {build.label}
      </a>
    );
  }

  if (isSoon) {
    return (
      <a
        href={build.href}
        className="font-semibold px-6 py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
      >
        <Download className="w-5 h-5" />
        {build.label} — coming soon
      </a>
    );
  }

  // iPhone and everything else: point at the PWA, which is the real product.
  return (
    <a
      href={build.href}
      className="font-semibold px-6 py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm border border-outline-variant text-on-surface hover:bg-surface-container-low"
    >
      <Smartphone className="w-5 h-5" />
      {build.label} ({getDeviceLabel()})
    </a>
  );
}
