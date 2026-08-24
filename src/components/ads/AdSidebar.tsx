"use client";

export default function AdSidebar() {
  return (
    <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-on-surface font-medium text-xs">
          Built with Aide by OmixSystems
        </span>
      </div>
      <a
        href="https://omixsystems.store"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary font-semibold hover:underline"
      >
        Create your own business app →
      </a>
    </div>
  );
}
