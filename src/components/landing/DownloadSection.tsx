import Image from "next/image";
import Link from "next/link";

interface DownloadSectionProps {
  version: string;
}

export default function DownloadSection({ version }: DownloadSectionProps) {
  const changelog = [
    { version: "v1.0.0", date: "2026-09-07", items: [
      "Initial Android APK release via Capacitor",
      "Debug and signed release builds",
      "Signed with production keystore",
      "App ID: com.omixsystems.aide",
      "Target: Android 5.1 (API 22) and above"
    ]}
  ];

  return (
    <section className="py-16 bg-surface-container-low" id="download">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight font-headline text-on-surface mb-2">
            Download Aide
          </h2>
          <p className="text-on-surface-variant max-w-lg mx-auto">
            Take your business management on the go. Install the Android app and manage your inventory, sales, and reports from your phone.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Android Download Card */}
          <div className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 16.439L19.5 15l-12.75-2.25L5.25 18.5l1.977 1.939L12 21.25l7.023-0.911z" />
                  <path fillOpacity="0.5" d="M7.732 19.23l-1.977-1.939L2.5 17.5l.638-2.884 2.766.971L7.732 19.23zM9.893 10.293l2.884-.637.971 2.766-2.884.638L9.893 10.293zM14.107 10.293L11.22 7.381l-.971-2.766 2.884-.637L14.107 10.293zM16.268 9.77L14.29 7.501l.637-2.884 2.884.971L16.268 9.77z" />
                  <path fillOpacity="0.5" d="M19.5 15l-1.977-1.561L16.268 9.77l-.637 2.884 2.766.971L19.5 15z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">Android</div>
                <div className="text-xs text-on-surface-variant/50">v{version}</div>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-success" />
                <div className="w-2 h-2 rounded-full bg-surface-container-highest" />
              </div>
            </div>
            <p className="text-sm text-on-surface-variant mb-4">
              Install the APK directly from GitHub Releases. Signed with production keystore.
            </p>
            <div className="space-y-2">
              <a
                href={`https://github.com/oliver4441/aide/releases/download/v${version}/aide-release.apk`}
                className="block w-full bg-primary text-on-primary font-semibold py-3 rounded-xl hover:bg-primary-light transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Download APK (v{version})
              </a>
              <p className="text-xs text-on-surface-variant/50 text-center">
                Requires Android 5.1+ • {new Date().getFullYear()} OmixSystems
              </p>
            </div>
          </div>

          {/* Changelog Card */}
          <div className="bg-surface-container border border-outline-variant rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-on-surface">What&apos;s New</h3>
            </div>
            <div className="space-y-3">
              {changelog.map((entry) => (
                <div key={entry.version} className="border-l-2 border-primary/30 pl-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-primary">{entry.version}</span>
                    <span className="text-xs text-on-surface-variant/50">{entry.date}</span>
                  </div>
                  <ul className="space-y-1">
                    {entry.items.map((item, i) => (
                      <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                        <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Requirements footer */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-4 text-xs text-on-surface-variant/50">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Secure and signed
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
              Offline capable
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Multi-business support
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
