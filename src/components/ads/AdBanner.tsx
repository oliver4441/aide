"use client";

import { useEffect, useRef, useState } from "react";

interface Ad {
  text: string;
  highlight: string;
  url: string;
  cta: string;
  icon: JSX.Element;
  accent: string;
}

const DISMISS_DAYS = 3;

const ads: Ad[] = [
  {
    text: "OmixSystems builds apps like Aide for your business",
    highlight: "omixsystems.store",
    url: "https://omixsystems.store",
    cta: "Visit",
    accent: "bg-primary/10 border-primary/20",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    text: "Sell on OmixSystems Market — list your products FREE",
    highlight: "market.omixsystems.store",
    url: "https://market.omixsystems.store",
    cta: "List free",
    accent: "bg-success/10 border-success/25",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    text: "Free product deliveries countrywide on Market",
    highlight: "market.omixsystems.store",
    url: "https://market.omixsystems.store",
    cta: "Shop now",
    accent: "bg-warning/10 border-warning/30",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
  },
  {
    text: "Need a website, app or POS system?",
    highlight: "omixsystems.store",
    url: "https://omixsystems.store",
    cta: "Get a quote",
    accent: "bg-success/10 border-success/25",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    text: "Reach thousands of buyers — free listing on Market",
    highlight: "market.omixsystems.store",
    url: "https://market.omixsystems.store",
    cta: "Start selling",
    accent: "bg-error/10 border-error/25",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
    ),
  },
  {
    text: "From idea to launch — software that fits your business",
    highlight: "omixsystems.store",
    url: "https://omixsystems.store",
    cta: "Learn more",
    accent: "bg-primary/10 border-primary/20",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

export default function AdBanner() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [fading, setFading] = useState(false);
  const idxRef = useRef(0);

  useEffect(() => {
    const raw = localStorage.getItem("aide_ad_dismissed");
    if (raw && Date.now() - Number(raw) < DISMISS_DAYS * 24 * 60 * 60 * 1000) {
      setDismissed(true);
    } else {
      localStorage.removeItem("aide_ad_dismissed");
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        idxRef.current = (idxRef.current + 1) % ads.length;
        setIdx(idxRef.current);
        setFading(false);
      }, 300);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  if (dismissed || !visible) return null;

  const ad = ads[idx];

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-10 pt-3">
      <div
        className={`border rounded-xl px-4 py-2 flex items-center justify-between gap-3 transition-opacity duration-300 ${ad.accent} ${
          fading ? "opacity-0" : "opacity-100"
        }`}
      >
        <span className="text-on-surface-variant shrink-0 hidden sm:block">{ad.icon}</span>
        <a
          href={ad.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-0 flex items-center gap-2 text-xs sm:text-[13px] truncate"
        >
          <span className="text-on-surface truncate">{ad.text}</span>
          <span className="text-primary font-semibold whitespace-nowrap hidden md:inline">{ad.highlight}</span>
          <span className="ml-auto text-primary font-semibold whitespace-nowrap hover:underline">
            {ad.cta} →
          </span>
        </a>
        <button
          onClick={() => {
            setVisible(false);
            localStorage.setItem("aide_ad_dismissed", String(Date.now()));
            setTimeout(() => setDismissed(true), 300);
          }}
          className="text-on-surface-variant/60 hover:text-on-surface p-1 rounded hover:bg-surface-container transition-colors shrink-0"
          aria-label="Dismiss ad"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
