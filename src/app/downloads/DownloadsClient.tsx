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
  AlertTriangle,
  Loader2,
} from "lucide-react";
import UiButton from "@/components/ui/UiButton";
import { fetchLatestRelease, getDeviceLabel, type ReleaseInfo } from "@/lib/device";



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
    return <span className="font-mono text-[11px] text-secondary/60">checksum unavailable</span>;
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
      className="inline-flex items-center gap-1.5 bg-ground px-2 py-1 font-mono text-[11px] text-secondary hover:text-ink transition-colors"
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

  const latestApk = release?.downloadUrl ?? null;

  const androidReleases = releases
    .map((item) => ({ ...item, assets: item.assets.filter((asset) => asset.name.toLowerCase().endsWith(".apk")) }))
    .filter((item) => item.assets.length > 0);

  return (
    <div className="min-h-screen bg-ground">
      {/* Top bar */}
      <div className="border-b border-rule">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Aide logo" className="w-7 h-7 object-cover" />
            <span className="font-display font-bold text-accent">Aide</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 space-y-10">
        {/* Header */}
        <header className="text-center">
          <h1 className="font-display text-3xl md:text-4xl font-black text-ink">
            Get Aide
          </h1>
          <p className="mt-3 text-secondary max-w-2xl mx-auto">
            Aide runs in your browser as an installable PWA. Android users can also
            install the native app for real system notifications.
          </p>
          {release?.version && (
            <p className="mt-2 text-sm text-accent font-medium">
              Latest Android build: v{release.version} · {formatBytes(release.sizeBytes)}
            </p>
          )}
        </header>

        {/* Android install card */}
        <section className="border border-accent/30 bg-ground p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-accent/15 text-accent">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-black text-ink">Aide for Android</h2>
              <p className="text-sm text-secondary mt-1">
                A native app with real Android notifications, background reminders and
                offline operation. No Play Store account needed.
              </p>
            </div>
          </div>

          <ol className="mt-6 space-y-3 text-sm text-secondary">
            {[
              { n: 1, t: "Download the APK", d: "Tap the button below — the file saves straight to your device." },
              { n: 2, t: "Allow installs from your browser", d: "Android will ask. Tap Settings → turn on “Allow from this source”." },
              { n: 3, t: "Open the APK and install", d: "Tap the downloaded file in your notifications or Downloads, then Install." },
            ].map((s) => (
              <li key={s.n} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent text-xs font-bold">
                  {s.n}
                </span>
                <span>
                  <span className="font-semibold text-ink">{s.t}</span>
 — {s.d}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {loading ? (
              <div className="flex h-[50px] w-full sm:w-64 items-center justify-center border border-rule">
                <Loader2 className="w-4 h-4 animate-spin text-secondary" />
              </div>
            ) : latestApk ? (
              <a
                href={latestApk}
                download={release?.apkName ?? true}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-accent px-6 py-3.5 text-sm font-semibold text-ground transition hover:bg-ink active:scale-[0.99]"
              >
                <Download className="w-4 h-4" />
                Download APK{release?.version ? ` (v${release.version})` : ""}
              </a>
            ) : (
              <div className="w-full border border-rule bg-ground px-4 py-3 text-sm text-secondary">
                No Android build published yet. Use the PWA in the meantime.
              </div>
            )}
            <UiButton href="/login" variant="outline" className="w-full sm:w-auto">
              Open Aide in browser
            </UiButton>
          </div>

          <p className="mt-4 flex items-start gap-2 text-xs text-secondary/70">
            <ShieldCheck className="w-4 h-4 shrink-0 text-success mt-0.5" />
            Verify the download against the SHA-256 checksum listed below before installing.
          </p>

          <div className="mt-4 border border-rule bg-ground p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
              Android says “App not installed”?
            </p>
            <p className="mt-2 text-sm text-secondary">
              That is Android refusing to replace the copy already on the phone, not a
              broken download. It happens when the installed Aide was signed with a
              different certificate — usually a debug build, or a release from before
              the signing key changed — when the download was truncated, or when the
              phone is out of free storage for the APK and its unpacked copy.
            </p>
            <p className="mt-2 text-sm text-secondary">
              <span className="font-semibold text-ink">Fix:</span> open Aide → Settings →
              Export data, then uninstall Aide and install this APK. Uninstalling deletes
              the app&apos;s local database, so export first. The release notes for each
              build list its signing-certificate fingerprint if you want to compare.
            </p>
          </div>
        </section>

        {/* iOS / PWA */}
        <section className="border border-rule bg-ground p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-accent/15 text-accent">
              <Apple className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display text-lg font-black text-ink">iPhone & iPad</h2>
              <p className="mt-1 text-sm text-secondary">
                Aide installs from Safari: tap the <span className="font-semibold text-ink">Share</span>{" "}
                button, then <span className="font-semibold text-ink">Add to Home Screen</span>.
                You get the full offline app with in-app notifications.
              </p>
            </div>
          </div>
        </section>

        {/* Releases */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-accent" />
            <h2 className="font-display text-xl font-black text-ink">Versions & checksums</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-secondary" />
            </div>
          ) : androidReleases.length === 0 ? (
            <p className="border border-rule bg-ground p-6 text-sm text-secondary">
              No releases published yet.
            </p>
          ) : (
            <div className="space-y-4">
              {androidReleases.map((r) => (
                <div
                  key={r.tag ?? r.name ?? "release"}
                  className="border border-rule bg-ground p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-ink">
                        v{r.version ?? r.tag}
                      </span>
                      {r.prerelease && (
                        <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-semibold text-warning">
                          pre-release
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-secondary">
                      {formatDate(r.publishedAt)}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {r.assets.map((a) => {
                      const hash = checksums?.[r.tag ?? ""]?.[a.name];
                      return (
                        <div
                          key={a.name}
                          className="flex flex-wrap items-center justify-between gap-3 border border-rule bg-ground px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">
                              {a.name}
                            </p>
                            <p className="text-[11px] text-secondary">
                              {formatBytes(a.sizeBytes)} · APK
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <CopyableHash hash={hash} />
                            <a
                              href={a.downloadUrl}
                              download={a.name}
                              className="inline-flex items-center gap-1.5 bg-accent px-3 py-1.5 text-xs font-semibold text-ground transition hover:bg-ink"
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

          <p className="mt-4 text-xs text-secondary/70">
            Checksums are SHA-256 of the exact APK bytes that were published. Verify
            the file with <span className="font-mono">sha256sum aide-release.apk</span> on Linux/macOS or
            <span className="font-mono"> certutil -hashfile aide-release.apk SHA256</span> on Windows, then compare with the value above.
          </p>
        </section>

        <p className="text-center text-xs text-secondary/50">
          Aide · Offline-First Business Management · Detected: {getDeviceLabel()}
        </p>
      </div>
    </div>
  );
}
