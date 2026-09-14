import Link from "next/link";

interface DownloadSectionProps {
  version: string;
}

export default function DownloadSection({ version }: DownloadSectionProps) {
  return (
    <section className="py-20 bg-surface-container-low" id="download">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-[1fr_0.8fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-5">
              Android app
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-headline text-on-surface mb-4">
              Aide is coming to Android.
            </h2>
            <p className="text-on-surface-variant max-w-xl leading-relaxed mb-6">
              We are building a dedicated Android experience, not simply wrapping the web app. The mobile app will be designed for fast checkout, stock management, offline work, and reliable synchronization on everyday phones.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-7">
              {[
                "Native Android experience",
                "Offline-first workflows",
                "Fast sales and inventory",
                "Automatic synchronization",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-on-surface">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">✓</span>
                  {item}
                </div>
              ))}
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center bg-primary text-on-primary font-semibold px-6 py-3 rounded-xl hover:bg-primary-light transition-colors text-sm"
            >
              Use Aide on the web
            </Link>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-6 bg-primary/5 blur-3xl rounded-full" />
            <div className="relative mx-auto w-56 h-[430px] rounded-[2rem] border-[6px] border-outline-variant bg-surface-container shadow-2xl p-3">
              <div className="h-full rounded-[1.4rem] bg-surface-container-low overflow-hidden">
                <div className="h-8 flex items-center justify-center">
                  <div className="w-16 h-1.5 rounded-full bg-outline-variant" />
                </div>
                <div className="px-4 pt-4">
                  <div className="text-[9px] text-on-surface-variant">Today</div>
                  <div className="text-base font-bold text-on-surface font-headline">KSh 45,230</div>
                  <div className="text-[8px] text-success mt-1">Sales are up 12.4%</div>
                  <div className="mt-5 h-24 rounded-xl bg-surface-container border border-outline-variant p-3 flex items-end gap-1">
                    {[30, 45, 38, 60, 52, 75, 63, 86].map((height, index) => (
                      <div key={index} className="flex-1 rounded-t bg-primary/30 last:bg-primary/80" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                  <div className="mt-3 space-y-2">
                    {["POS sales", "Inventory", "Reports"].map((label) => (
                      <div key={label} className="flex items-center justify-between rounded-lg bg-surface-container border border-outline-variant px-3 py-2">
                        <span className="text-[9px] text-on-surface">{label}</span>
                        <span className="text-[8px] text-primary">Open →</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-5 left-8 right-8 h-10 rounded-xl bg-primary flex items-center justify-around text-[8px] text-on-primary font-medium">
                  <span>Home</span><span>Sales</span><span>Stock</span><span>More</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-on-surface-variant/50 mt-10">
          Current web release: v{version} • Native Android build is on the roadmap
        </p>
      </div>
    </section>
  );
}
