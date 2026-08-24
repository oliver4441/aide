"use client";

import { useEffect, useState } from "react";
import ReviewModal from "./ReviewModal";

export default function ReviewPrompt() {
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("aide_review_dismissed");
    if (dismissed === "true") return;

    try {
      const salesRaw = localStorage.getItem("aide_sales_count");
      const count = salesRaw ? parseInt(salesRaw, 10) : 0;
      if (count >= 3) setVisible(true);
    } catch {
      // ignore
    }
  }, []);

  if (!visible || show) {
    if (show) {
      return (
        <ReviewModal
          onClose={() => {
            setShow(false);
            setVisible(false);
          }}
        />
      );
    }
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-surface-container-high border border-outline-variant rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4">
        <button
          onClick={() => setShow(true)}
          className="flex items-center gap-2 text-sm font-medium text-on-surface hover:text-primary transition-colors"
        >
          <span className="text-warning text-lg">★</span>
          How is Aide working for you? Leave a review
        </button>
        <button
          onClick={() => {
            localStorage.setItem("aide_review_dismissed", "true");
            setVisible(false);
          }}
          className="text-on-surface-variant hover:text-on-surface transition-colors ml-2"
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
