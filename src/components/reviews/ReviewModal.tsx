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
    <div className="flex gap-1 font-display">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onRate(n)}
          className={`${size} transition-colors ${
            n <= rating ? "text-warning" : "text-secondary hover:text-warning/50"
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ground/80 p-4">
        <div className="border border-rule bg-ground w-full max-w-md p-8 text-center">
          <div className="w-14 h-14 border border-ink bg-ground flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-display text-lg font-black text-ink mb-2">Thank you!</h3>
          <p className="text-secondary text-sm mb-6">Your feedback helps us improve Aide.</p>
          <button
            onClick={onClose}
            className="border border-ink bg-ink text-ground font-display font-black py-2.5 px-8 hover:bg-ground hover:text-ink text-sm"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ground/80 p-4">
      <div className="border border-rule bg-ground w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-rule flex items-center justify-between font-display">
          <h3 className="font-black text-ink">Leave a Review</h3>
          <button
            onClick={onClose}
            className="text-secondary hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto font-reading">
          {categories.map((cat) => {
            const key = keyMap[cat];
            return (
              <div key={cat}>
                <p className="text-sm font-black text-ink mb-1.5">{cat}</p>
                <StarRating
                  rating={ratings[key]}
                  onRate={(n) => setRatings((prev) => ({ ...prev, [key]: n }))}
                />
              </div>
            );
          })}

          <div>
            <label className="font-display text-sm font-black text-ink block mb-1.5">
              Comment <span className="font-normal text-secondary">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full border border-rule bg-ground text-ink font-display text-sm placeholder:text-secondary focus:outline-none focus:border-accent resize-none"
              placeholder="Tell us what you think..."
            />
          </div>

          <div className="flex items-center gap-2 font-reading">
            <input
              type="checkbox"
              id="mayContact"
              checked={mayContact}
              onChange={(e) => setMayContact(e.target.checked)}
              className="w-4 h-4 border border-rule bg-ground text-accent"
            />
            <label htmlFor="mayContact" className="text-sm text-secondary">
              May we contact you?
            </label>
          </div>

          {mayContact && (
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full border border-rule bg-ground text-ink font-display text-sm placeholder:text-secondary focus:outline-none focus:border-accent"
            />
          )}
        </div>

        <div className="p-5 border-t border-rule flex justify-end gap-3 font-display">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-black text-secondary hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!allRated || submitting}
            className="px-6 py-2.5 text-sm font-black border border-ink bg-ink text-ground hover:bg-ground hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}