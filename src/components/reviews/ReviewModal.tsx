"use client";

import { useState } from "react";

const categories = ["Overall", "POS Speed", "Offline Reliability", "Receipt Quality"] as const;
type CategoryKey = "overall" | "pos" | "offline" | "receipts";

const keyMap: Record<string, CategoryKey> = {
  Overall: "overall",
  "POS Speed": "pos",
  "Offline Reliability": "offline",
  "Receipt Quality": "receipts",
};

function StarRating({
  rating,
  onRate,
  size = "text-2xl",
}: {
  rating: number;
  onRate: (n: number) => void;
  size?: string;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onRate(n)}
          className={`${size} transition-colors ${
            n <= rating ? "text-warning" : "text-outline-variant hover:text-warning/50"
          }`}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ReviewModal({ onClose }: { onClose: () => void }) {
  const [ratings, setRatings] = useState<Record<CategoryKey, number>>({
    overall: 0,
    pos: 0,
    offline: 0,
    receipts: 0,
  });
  const [comment, setComment] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [mayContact, setMayContact] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const allRated = Object.values(ratings).every((r) => r > 0);

  const handleSubmit = async () => {
    if (!allRated) return;
    setSubmitting(true);
    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: ratings.overall,
          categories: ratings,
          comment: comment || null,
          contactEmail: mayContact ? contactEmail : null,
        }),
      });
      setSubmitted(true);
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
        <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md border border-outline-variant p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-success flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-on-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-headline font-bold text-on-surface mb-2">Thank you!</h3>
          <p className="text-on-surface-variant text-sm mb-6">Your feedback helps us improve Aide.</p>
          <button
            onClick={onClose}
            className="bg-primary text-on-primary font-semibold py-2.5 px-8 rounded-xl hover:bg-primary-light transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md border border-outline-variant overflow-hidden">
        <div className="p-5 border-b border-outline-variant flex items-center justify-between">
          <h3 className="text-lg font-headline font-bold text-on-surface">Leave a Review</h3>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {categories.map((cat) => {
            const key = keyMap[cat];
            return (
              <div key={cat}>
                <p className="text-sm font-medium text-on-surface mb-1.5">{cat}</p>
                <StarRating
                  rating={ratings[key]}
                  onRate={(n) => setRatings((prev) => ({ ...prev, [key]: n }))}
                />
              </div>
            );
          })}

          <div>
            <label className="text-sm font-medium text-on-surface block mb-1.5">
              Comment <span className="text-on-surface-variant font-normal">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              placeholder="Tell us what you think..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="mayContact"
              checked={mayContact}
              onChange={(e) => setMayContact(e.target.checked)}
              className="accent-primary"
            />
            <label htmlFor="mayContact" className="text-sm text-on-surface-variant">
              May we contact you?
            </label>
          </div>

          {mayContact && (
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          )}
        </div>

        <div className="p-5 border-t border-outline-variant flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!allRated || submitting}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-on-primary hover:bg-primary-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
