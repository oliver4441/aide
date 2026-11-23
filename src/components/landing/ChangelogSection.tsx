"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Container from "@/components/ui/Container";
import MarkdownNotes from "./MarkdownNotes";
import { fetchRecentReleases, type UnifiedRelease } from "@/lib/releases";

export default function ChangelogSection() {
  const [releases, setReleases] = useState<UnifiedRelease[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentReleases(4)
      .then(setReleases)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="changelog" className="border-t border-rule border-b border-rule py-16">
      <Container wide>
        <div className="flex items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-black text-ink mb-2">
              What&apos;s New
            </h2>
            <p className="font-reading text-secondary">
              Latest updates across the PWA, Android and Desktop apps.
            </p>
          </div>
          <Link
            href="/changelog"
            className="np-btn text-sm ml-auto shrink-0"
          >
            View all changes
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-rule p-6 animate-pulse">
                <div className="h-5 bg-ground w-1/3 mb-4" />
                <div className="h-4 bg-ground w-full mb-2" />
                <div className="h-4 bg-ground w-3/4" />
              </div>
            ))}
          </div>
        ) : releases.length === 0 ? (
          <p className="text-center text-secondary py-8">No releases yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {releases.map((r) => (
              <div
                key={r.tag ?? r.name ?? r.version ?? "release"}
                className="border border-rule p-6 h-full flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-ink">
                        v{r.version ?? r.tag}
                      </span>
                      {r.prerelease && (
                        <span className="rounded-none bg-warning/20 px-2 py-0.5 text-[10px] font-semibold text-warning">
                          pre-release
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-secondary">
                      {new Date(r.publishedAt ?? "").toLocaleDateString("en-KE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-display font-black px-2 py-0.5 border ${
                      r.family === "android"
                        ? "border-success text-success"
                        : "border-accent text-accent"
                    }`}
                  >
                    {r.family === "android" ? "Android" : "Desktop"}
                  </span>
                </div>

                <div className="flex-1 overflow-hidden">
                  <MarkdownNotes notes={r.notes} />
                </div>

                {r.url && (
                  <Link
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    View on GitHub
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}