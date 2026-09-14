export default function DownloadSection() {
  return (
    <section className="border-y border-outline-variant bg-surface-container-low py-20" id="android">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.7fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-3 py-1.5 text-xs font-semibold text-on-surface-variant">
              Android companion
            </div>
            <h2 className="mb-4 font-headline text-3xl font-bold tracking-tight text-on-surface md:text-4xl">
              Use Aide on the web today. Android comes next.
            </h2>
            <p className="mb-6 max-w-xl leading-relaxed text-on-surface-variant">
              The Aide PWA is the primary experience: open it in your browser, install it to your home screen, and keep working offline. We are also building a dedicated native Android experience for faster everyday use on phones.
            </p>
            <div className="mb-7 grid gap-3 sm:grid-cols-2">
              {[
                "The PWA is ready to use",
                "Installable from the browser",
                "Native Android experience in development",
                "Offline-first workflows across devices",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-on-surface">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">✓</span>
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
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-6 rounded-full bg-primary/5 blur-3xl" />
            <div className="relative mx-auto w-56 rounded-[2rem] border-[6px] border-outline-variant bg-surface-container p-3 shadow-2xl">
              <div className="relative h-[430px] overflow-hidden rounded-[1.4rem] bg-surface-container-low">
                <div className="flex h-8 items-center justify-center">
                  <div className="h-1.5 w-16 rounded-full bg-outline-variant" />
                </div>
                <div className="px-4 pt-4">
                  <div className="text-[9px] text-on-surface-variant">Aide mobile</div>
                  <div className="font-headline text-base font-bold text-on-surface">KSh 45,230</div>
                  <div className="mt-1 text-[8px] text-success">Native Android experience</div>
                  <div className="mt-5 flex h-24 items-end gap-1 rounded-xl border border-outline-variant bg-surface-container p-3">
                    {[30, 45, 38, 60, 52, 75, 63, 86].map((height, index) => (
                      <div key={index} className="flex-1 rounded-t bg-primary/30 last:bg-primary/80" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                  <div className="mt-3 space-y-2">
                    {["POS sales", "Inventory", "Reports"].map((label) => (
                      <div key={label} className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container px-3 py-2">
                        <span className="text-[9px] text-on-surface">{label}</span>
                        <span className="text-[8px] text-primary">Open →</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-5 left-8 right-8 flex h-10 items-center justify-around rounded-xl bg-primary text-[8px] font-medium text-on-primary">
                  <span>Home</span><span>Sales</span><span>Stock</span><span>More</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-on-surface-variant/50">
          Android is an additional client for Aide — not a replacement for the web/PWA experience.
        </p>
      </div>
    </section>
  );
}
