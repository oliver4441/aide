"use client";

import UiButton from "@/components/ui/UiButton";
import Container from "@/components/ui/Container";
import Link from "next/link";

export default function DownloadSection() {
  return (
    <section id="android" className="border-t border-rule border-b border-rule py-16">
      <Container wide>
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.7fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-3 py-1.5 text-xs font-semibold text-on-surface-variant">
              Android app
            </div>
            <h2 className="mb-4 font-headline text-3xl font-bold tracking-tight text-on-surface md:text-4xl">
              Take Aide with you on Android.
            </h2>
            <p className="mb-6 max-w-xl leading-relaxed text-on-surface-variant">
              Keep using the full Aide PWA in your browser, or download the Android APK for native notifications and background reminders. Both are designed for offline work.
            </p>
            <div className="mb-7 grid gap-3 sm:grid-cols-2">
              {[
                "The PWA is ready to use",
                "Installable from the browser",
                "Android APK available to download",
                "Offline-first workflows across devices",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-secondary font-reading">
                  <span className="flex h-5 w-5 items-center justify-center border border-rule text-xs text-ink">✓</span>
                  {item}
                </div>
              ))}
            </div>
            <a
              href="#product"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-light"
            >
              Use Aide on the web
            </a>
            <a
              href="/downloads"
              className="ml-3 inline-flex items-center justify-center rounded-xl border border-outline-variant px-6 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
            >
              Get the Android APK
            </a>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="relative mx-auto w-56 border-[6px] border-rule bg-ground p-3">
              <div className="relative h-[430px] overflow-hidden border border-rule bg-ground">
                <div className="flex h-8 items-center justify-center">
                  <div className="h-1.5 w-16 border border-rule" />
                </div>
                <div className="px-4 pt-4">
                  <div className="text-[9px] text-on-surface-variant">Aide mobile</div>
                  <div className="font-headline text-base font-bold text-on-surface">KSh 45,230</div>
                  <div className="mt-1 text-[8px] text-success">Offline ready</div>
                  <div className="mt-5 flex h-24 items-end gap-1 rounded-xl border border-outline-variant bg-surface-container p-3">
                    {[30, 45, 38, 60, 52, 75, 63, 86].map((height, index) => (
                      <div key={index} className="flex-1 border-l border-accent" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                  <div className="mt-3 space-y-2">
                    {["POS sales", "Inventory", "Reports"].map((label) => (
                      <div key={label} className="flex items-center justify-between border border-rule bg-ground px-3 py-2">
                        <span className="text-[9px] text-secondary">{label}</span>
                        <span className="text-[8px] text-accent">Open →</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-5 left-8 right-8 flex h-10 items-center justify-around border border-rule text-[8px] font-display font-black text-secondary">
                  <span>Home</span><span>Sales</span><span>Stock</span><span>More</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-10 text-center text-xs font-reading text-secondary">
          Android is an additional client for Aide — not a replacement for the web/PWA experience.
        </p>
      </Container>
    </section>
  );
}