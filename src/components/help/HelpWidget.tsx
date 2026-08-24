"use client";

import { useState } from "react";
import HelpCenter from "./HelpCenter";

export default function HelpWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 md:bottom-8 right-6 z-40 w-12 h-12 bg-primary text-on-primary rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary-light transition-all hover:scale-105"
        aria-label="Open Help Center"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      <HelpCenter open={open} onClose={() => setOpen(false)} />
    </>
  );
}
