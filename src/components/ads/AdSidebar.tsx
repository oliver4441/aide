"use client";

export default function AdSidebar() {
  return (
    <div className="border border-rule p-4 bg-ground text-sm font-reading">
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="font-black text-ink">
          Built with Aide by OmixSystems
        </span>
      </div>
      <a
        href="https://omixsystems.store"
        target="_blank"
        rel="noopener noreferrer"
        className="font-black text-ink hover:underline"
      >
        Create your own business app →
      </a>
    </div>
  );
}