"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UiSpinner from "@/components/ui/UiSpinner";

interface Review {
  id: string;
  rating: number;
  categories: Record<string, number>;
  comment: string | null;
  contactEmail: string | null;
  businessId: string;
  createdAt: string;
}

export default function AdminReviewsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [total, setTotal] = useState(0);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    const role = (session?.user as any)?.role;
    if (role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    fetchReviews();
  }, [status, filterRating]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const url = filterRating ? `/api/reviews?rating=${filterRating}` : "/api/reviews";
      const res = await fetch(url);
      const data = await res.json();
      setReviews(data.reviews);
      setAverageRating(data.averageRating);
      setTotal(data.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? "text-warning" : "text-secondary"}>&starf;</span>
    ));

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <UiSpinner size={32} className="text-ink" />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-reading">
      <div className="border-b border-rule pb-6">
        <h1 className="font-display text-2xl md:text-3xl font-black text-ink">Reviews</h1>
        <p className="font-display text-sm text-secondary mt-1">Customer feedback and ratings</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-rule p-5 bg-ground">
          <p className="font-display text-xs font-black uppercase tracking-wider text-secondary">Average Rating</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-display text-3xl font-black text-ink">{averageRating.toFixed(1)}</span>
            <div className="flex">{renderStars(Math.round(averageRating))}</div>
          </div>
        </div>
        <div className="border border-rule p-5 bg-ground">
          <p className="font-display text-xs font-black uppercase tracking-wider text-secondary">Total Reviews</p>
          <p className="font-display text-3xl font-black text-ink mt-2">{total}</p>
        </div>
        <div className="border border-rule p-5 bg-ground">
          <p className="font-display text-xs font-black uppercase tracking-wider text-secondary">Filter</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <button
              onClick={() => setFilterRating(null)}
              className={`px-3 py-1 text-xs font-black border border-rule ${
                filterRating === null
                  ? "bg-ink text-ground"
                  : "text-secondary hover:text-ink"
              }`}
            >
              All
            </button>
            {[5, 4, 3, 2, 1].map((r) => (
              <button
                key={r}
                onClick={() => setFilterRating(r)}
                className={`px-3 py-1 text-xs font-black border border-rule ${
                  filterRating === r
                    ? "bg-ink text-ground"
                    : "text-secondary hover:text-ink"
                }`}
              >
                {r}★
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-rule bg-ground overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full font-display">
            <thead>
              <tr className="border-b border-rule">
                <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-secondary">Rating</th>
                <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-secondary">Comment</th>
                <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-secondary">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-secondary">Date</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-secondary">
                    No reviews yet.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.id} className="border-b border-rule">
                    <td className="px-4 py-3">
                      <div className="flex">{renderStars(review.rating)}</div>
                    </td>
                    <td className="px-4 py-3 text-ink max-w-xs truncate">
                      {review.comment || "—"}
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {review.contactEmail || "—"}
                    </td>
                    <td className="px-4 py-3 text-secondary whitespace-nowrap">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
