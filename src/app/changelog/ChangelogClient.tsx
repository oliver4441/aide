"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Check, Monitor, Smartphone, Globe, Copy } from "lucide-react";
import UiButton from "@/components/ui/UiButton";
import { fetchAllReleases, formatBytes, formatDate, shortHash, type UnifiedRelease } from "@/lib/releases";

interface Checksums {
  releases: Record<string, Record<string, string>>;
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
      className="inline-flex items-center gap-1.5 bg-ground px-2 py-1 font-mono text-[11px] text-secondary hover:text-ink"
    >
      {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : shortHash(hash)}
    </button>
  );
}

interface ChangelogClientProps {
  platform?: "all" | "android" | "desktop";
}

export default function ChangelogClient({ platform = "all" }: ChangelogClientProps = {}) {
  const [releases, setReleases] = useState<UnifiedRelease[]>([]);
  const [checksums, setChecksums] = useState<Checksums>({ releases: {} });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "android" | "desktop">(platform === "desktop" ? "desktop" : platform);

  useEffect(() => {
    let active = true;

    (async () => {
      const [list, sums] = await Promise.all([
        fetchAllReleases().catch(() => []),
        // apk-checksums.json holds hashes for both android and desktop assets.
        fetch("/apk-checksums.json")
          .then((r) => (r.ok ? r.json() : { releases: {} }))
          .catch(() => ({ releases: {} })),
      ]);

      if (!active) return;
      setReleases(list);
      setChecksums(sums ?? { releases: {} });
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [platform]);

  const filteredReleases = releases.filter((r) => {
    if (platform === "all") {
      return filter === "all" ? true : r.family === filter;
    }
    if (platform === "desktop") {
      return r.family === "desktop";
    }
    return r.family === "android";
  });

  return (
    <div className="min-h-screen bg-ground">
      {/* Top bar */}
      <div className="border-b border-rule">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-ink"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to home
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
          <div className="inline-flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-accent" />
            <h1 className="font-display text-3xl md:text-4xl font-black text-ink">Changelog</h1>
          </div>
          <p className="text-secondary max-w-2xl mx-auto">
            Every published release across the PWA, Android and Desktop apps.
            Release notes are sourced directly from GitHub.
          </p>
        </header>

        {/* Filter tabs */}
        {platform === "all" && (
          <div className="flex items-center gap-2 border border-rule p-1">
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 py-2 text-sm font-display ${
                filter === "all" ? "bg-ink text-ground" : "text-secondary hover:text-ink"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("android")}
              className={`flex-1 py-2 text-sm font-display ${
                filter === "android" ? "bg-ink text-ground" : "text-secondary hover:text-ink"
              }`}
            >
              <Smartphone className="w-4 h-4 inline mr-1" /> Android
            </button>
            <button
              onClick={() => setFilter("desktop")}
              className={`flex-1 py-2 text-sm font-display ${
                filter === "desktop" ? "bg-ink text-ground" : "text-secondary hover:text-ink"
              }`}
            >
              <Monitor className="w-4 h-4 inline mr-1" /> Desktop
            </button>
          </div>
        )}

        {/* Releases list */}
        <section>
          {loading ? (
            <div className="flex justify-center py-12">
              <svg className="h-6 w-6 animate-spin text-secondary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : filteredReleases.length === 0 ? (
            <p className="text-center text-secondary py-8">No releases found for this filter.</p>
          ) : (
            <div className="space-y-4">
              {filteredReleases.map((r) => (
                <div
                  key={r.tag ?? r.name ?? "release"}
                  className="border border-rule bg-ground p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-display font-bold text-ink ${
                        r.family === "android" ? "text-success" : "text-accent"
                      }`}>
                        {r.family === "android" ? (
                          <>
                            <Smartphone className="w-4 h-4 inline mr-1" />
                          </>
                        ) : (
                          <>
                            <Monitor className="w-4 h-4 inline mr-1" />
                          </>
                        )}
                        v{r.version ?? r.tag}
                      </span>
                      {r.prerelease && (
                        <span className="rounded-none bg-warning/20 px-2 py-0.5 text-[10px] font-semibold text-warning">
                          pre-release
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-secondary">
                      {formatDate(r.publishedAt)}
                    </span>
                  </div>

                  {r.notes && (
                    <div className="mt-4 font-reading text-sm text-secondary leading-relaxed whitespace-pre-wrap">
                      {r.notes}
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    {r.assets.map((a) => {
                      const hash = checksums?.releases?.[r.tag ?? ""]?.[a.name];
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
                              {formatBytes(a.sizeBytes)} · {a.name.toLowerCase().endsWith(".apk") ? "APK" : a.name.toLowerCase().endsWith(".exe") ? "Windows" : a.name.toLowerCase().endsWith(".dmg") ? "macOS" : a.name.toLowerCase().endsWith(".appimage") ? "Linux" : a.name.toLowerCase().endsWith(".deb") ? "Linux" : "Asset"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <CopyableHash hash={hash} />
                            <a
                              href={a.downloadUrl}
                              download={a.name}
                              className="inline-flex items-center gap-1.5 bg-accent px-3 py-1.5 text-xs font-semibold text-ground hover:bg-ink"
                            >
                              <Package className="w-3.5 h-3.5" />
                              Download
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {r.url && (
                    <div className="mt-4">
                      <Link
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        View on GitHub
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6 21 13.5M13.5 6 3 13.5m0 0 10.5 7.5M3 13.5h18" />
                        </svg>
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-secondary/70">
            Checksums are SHA-256 of the exact release bytes. Verify with
            <span className="font-mono">sha256sum <span className="text-accent">file</span></span> (Linux/macOS) or
            <span className="font-mono">certutil -hashfile <span className="text-accent">file</span> SHA256</span> (Windows).
          </p>
        </section>

        <p className="text-center text-xs text-secondary/50">
          Aide · Offline-First Business Management
        </p>
      </div>
    </div>
  );
}