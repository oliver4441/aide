"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ShieldCheck,
  Smartphone,
  Package,
  Apple,
  Monitor,
  Loader2,
} from "lucide-react";
import UiButton from "@/components/ui/UiButton";
import { fetchLatestRelease, getDeviceLabel, getDeviceType, type ReleaseInfo } from "@/lib/device";



interface ReleaseAsset {
  name: string;
  sizeBytes: number;
  downloadUrl: string;
}

interface Release {
  tag: string | null;
  version: string | null;
  /** Android's build number. null for anything that is not an APK release. */
  versionCode: number | null;
  name: string | null;
  notes: string | null;
  prerelease: boolean;
  publishedAt: string | null;
  url: string | null;
  assets: ReleaseAsset[];
}

type Checksums = Record<string, Record<string, string>>;

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function shortHash(hash?: string): string {
  if (!hash) return "checksum unavailable";
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
}

function CopyableHash({ hash }: { hash?: string }) {
  const [copied, setCopied] = useState(false);

  if (!hash) {
    return <span className="font-mono text-[11px] text-on-surface-variant/60">checksum unavailable</span>;
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <button
      onClick={copy}
      title="Copy full SHA-256"
      className="inline-flex items-center gap-1.5 rounded-md bg-surface-container px-2 py-1 font-mono text-[11px] text-on-surface-variant hover:text-on-surface transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : shortHash(hash)}
    </button>
  );
}

export default function DownloadsClient() {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [checksums, setChecksums] = useState<Checksums>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      const [latest, list, sums] = await Promise.all([
        fetchLatestRelease().catch(() => null),
        fetch("/api/releases")
          .then((r) => (r.ok ? r.json() : { releases: [] }))
          .catch(() => ({ releases: [] })),
        fetch("/apk-checksums.json")
          .then((r) => (r.ok ? r.json() : { releases: {} }))
          .catch(() => ({ releases: {} })),
      ]);

      if (!active) return;
      setRelease(latest);
      setReleases(Array.isArray(list?.releases) ? list.releases : []);
      setChecksums(sums?.releases ?? {});
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  const device = typeof window !== "undefined" ? getDeviceType() : "unknown";
  const latestApk = release?.downloadUrl ?? null;

  // Newest desktop (Electron) release, if one is published. Distinct from the
  // Android `v*` tags so the two client families never collide on this page.
  const desktopRelease = releases.find((r) => r.tag?.startsWith("desktop-")) ?? null;

  const desktopLabel = (name: string): string => {
    if (/\.exe$/i.test(name)) return "Windows installer";
    if (/\.dmg$/i.test(name)) return name.includes("arm64") ? "macOS (Apple Silicon)" : "macOS (Intel)";
    if (/\.AppImage$/i.test(name)) return name.includes("arm64") ? "Linux AppImage (ARM64)" : "Linux AppImage";
    if (/\.deb$/i.test(name)) return name.includes("arm64") ? "Linux package (ARM64)" : "Linux package";
    if (/mac\.zip$/i.test(name)) return name.includes("arm64") ? "macOS zip (Apple Silicon)" : "macOS zip";
    if (/\.zip$/i.test(name)) return "Desktop archive";
    return "Desktop build";
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Top bar */}
      <div className="border-b border-outline-variant">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Aide logo" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-headline font-bold text-primary">Aide</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 space-y-10">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-on-surface font-headline">
            Get Aide
          </h1>
          <p className="mt-3 text-on-surface-variant max-w-2xl mx-auto">
            Aide runs in your browser as an installable PWA. Android users can also
            install the native app for real system notifications.
          </p>
          {release?.version && (
            <p className="mt-2 text-sm text-primary font-medium">
              Latest Android build: v{release.version} · {formatBytes(release.sizeBytes)}
            </p>
          )}
        </header>

        {/* Android install card */}
        <section className="rounded-2xl border border-primary/30 bg-surface-container-low p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-on-surface font-headline">Aide for Android</h2>
              <p className="text-sm text-on-surface-variant mt-1">
                A native app with real Android notifications, background reminders and
                offline operation. No Play Store account needed.
              </p>
            </div>
          </div>

          <ol className="mt-6 space-y-3 text-sm text-on-surface-variant">
            {[
              { n: 1, t: "Download the APK", d: "Tap the button below — the file saves straight to your device." },
              { n: 2, t: "Allow installs from your browser", d: "Android will ask. Tap Settings → turn on “Allow from this source”." },
              { n: 3, t: "Open the APK and install", d: "Tap aide-release.apk in your downloads, then Install. Done." },
            ].map((s) => (
              <li key={s.n} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                  {s.n}
                </span>
                <span>
                  <span className="font-semibold text-on-surface">{s.t}</span>
 — {s.d}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {loading ? (
              <div className="flex h-[50px] w-full sm:w-64 items-center justify-center rounded-xl border border-outline-variant">
                <Loader2 className="w-4 h-4 animate-spin text-on-surface-variant" />
              </div>
            ) : latestApk ? (
              <a
                // Same-origin on purpose: the `download` attribute is ignored
                // for cross-origin URLs, so linking GitHub's asset CDN directly
                // sent users to an interstitial before the file started.
                // /download/apk redirects to the Vercel Blob copy.
                href="/download/apk"
                download={release?.apkName ?? true}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-on-primary shadow-lg shadow-primary/20 transition hover:bg-primary-light active:scale-[0.99]"
              >
                <Download className="w-4 h-4" />
                Download APK{release?.version ? ` (v${release.version})` : ""}
              </a>
            ) : (
              <div className="w-full rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
                No Android build published yet. Use the PWA in the meantime.
              </div>
            )}
            <UiButton href="/login" variant="outline" className="w-full sm:w-auto">
              Open Aide in browser
            </UiButton>
          </div>

          <p className="mt-4 flex items-start gap-2 text-xs text-on-surface-variant/70">
            <ShieldCheck className="w-4 h-4 shrink-0 text-success mt-0.5" />
            Verify the download against the SHA-256 checksum listed below before installing.
          </p>
        </section>

        {/* iOS / PWA */}
        <section className="rounded-2xl border border-outline-variant bg-surface-container-low p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Apple className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-on-surface font-headline">iPhone & iPad</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Aide installs from Safari: tap the <span className="font-semibold text-on-surface">Share</span>{" "}
                button, then <span className="font-semibold text-on-surface">Add to Home Screen</span>.
                You get the full offline app with in-app notifications.
              </p>
            </div>
          </div>
        </section>

        {/* Desktop */}
        <section className="rounded-2xl border border-outline-variant bg-surface-container-low p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Monitor className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-on-surface font-headline">Windows, macOS & Linux</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                The Aide desktop app is a native shell for the PWA — real system
                notifications, background reminders and offline access, in a
                standalone window.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex h-[50px] w-full items-center justify-center rounded-xl border border-outline-variant mt-5">
              <Loader2 className="w-4 h-4 animate-spin text-on-surface-variant" />
            </div>
          ) : desktopRelease ? (
            <div className="mt-5 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  Aide Desktop v{desktopRelease.version ?? "1.0.0"}
                </span>
                {desktopRelease.publishedAt && (
                  <span className="text-xs text-on-surface-variant">{formatDate(desktopRelease.publishedAt)}</span>
                )}
              </div>
              {desktopRelease.assets.map((a) => (
                <div
                  key={a.name}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-on-surface">{desktopLabel(a.name)}</p>
                    <p className="text-[11px] text-on-surface-variant font-mono">{a.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline text-[11px] text-on-surface-variant">{formatBytes(a.sizeBytes)}</span>
                    <a
                      href={a.downloadUrl}
                      download={a.name}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary transition hover:bg-primary-light"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
              Native desktop builds are still in progress. Aide works today in your
              browser and installs as a desktop app from Chrome or Edge.
            </div>
          )}
        </section>

        {/* Releases */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-on-surface font-headline">Versions & checksums</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-on-surface-variant" />
            </div>
          ) : releases.length === 0 ? (
            <p className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-sm text-on-surface-variant">
              No releases published yet.
            </p>
          ) : (
            <div className="space-y-4">
              {releases.map((r) => (
                <div
                  key={r.tag ?? r.name ?? "release"}
                  className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-headline font-bold text-on-surface">
                        v{r.version ?? r.tag}
                      </span>
                      {r.prerelease && (
                        <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-semibold text-warning">
                          pre-release
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-on-surface-variant">
                      {formatDate(r.publishedAt)}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {r.assets.map((a) => {
                      const hash = checksums?.[r.tag ?? ""]?.[a.name];
                      const isApk = a.name.toLowerCase().endsWith(".apk");
                      return (
                        <div
                          key={a.name}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-on-surface">
                              {a.name}
                            </p>
                            <p className="text-[11px] text-on-surface-variant">
                              {formatBytes(a.sizeBytes)}
                              {isApk && " · APK"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <CopyableHash hash={hash} />
                            <a
                              href={a.downloadUrl}
                              download={a.name}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary transition hover:bg-primary-light"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-on-surface-variant/70">
            Checksums are SHA-256 of the exact bytes that were published. Verify
            the file you downloaded by naming it — on Linux or macOS{" "}
            <span className="font-mono">sha256sum Aide.Setup.1.0.0.exe</span>, on Windows{" "}
            <span className="font-mono">certutil -hashfile Aide.Setup.1.0.0.exe SHA256</span> —
            and compare with the value above.
          </p>
        </section>

        <p className="text-center text-xs text-on-surface-variant/50">
          Aide · Offline-First Business Management · Detected: {getDeviceLabel()}
        </p>
      </div>
    </div>
  );
}
