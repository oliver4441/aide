"use client";

import { useState } from "react";

interface AdBannerProps {
  position: "top" | "bottom" | "inline";
}

const adContent = [
  {
    text: "Powered by OmixSystems",
    subtext: "Build your own business app",
    url: "https://omixsystems.store",
    cta: "Learn more",
  },
  {
    text: "Explore more tools on OmixSystems Market",
    subtext: "Templates, plugins & more",
    url: "https://market.omixsystems.store",
    cta: "Browse market",
  },
];

export default function AdBanner({ position }: AdBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [idx, setIdx] = useState(0);

  const ad = adContent[idx];

  if (dismissed) return null;

  return (
    <div
      className={`mx-4 md:mx-10 my-4 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-sm`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
        <span className="text-on-surface font-medium">{ad.text}</span>
        <span className="text-on-surface-variant text-xs hidden sm:inline">
          {ad.subtext}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href={ad.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
        >
          {ad.cta}
        </a>
        <button
          onClick={() => {
            if (position === "inline") {
              setIdx((prev) => (prev + 1) % adContent.length);
            } else {
              setDismissed(true);
            }
          }}
          className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
