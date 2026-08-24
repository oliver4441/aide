"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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
    if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
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
      <span key={i} className={i < rating ? "text-warning" : "text-outline-variant"}>
        ★
      </span>
    ));

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-bold text-on-surface">Reviews</h1>
        <p className="text-on-surface-variant text-sm mt-1">Customer feedback and ratings</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant">
          <p className="text-on-surface-variant text-xs uppercase tracking-wider">Average Rating</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-3xl font-bold text-on-surface">{averageRating.toFixed(1)}</span>
            <div className="flex">{renderStars(Math.round(averageRating))}</div>
          </div>
        </div>
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant">
          <p className="text-on-surface-variant text-xs uppercase tracking-wider">Total Reviews</p>
          <p className="text-3xl font-bold text-on-surface mt-2">{total}</p>
        </div>
        <div className="bg-surface-container rounded-xl p-5 border border-outline-variant">
          <p className="text-on-surface-variant text-xs uppercase tracking-wider">Filter</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <button
              onClick={() => setFilterRating(null)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                filterRating === null
                  ? "bg-primary text-on-primary border-primary"
                  : "bg-surface-container text-on-surface border-outline-variant"
              }`}
            >
              All
            </button>
            {[5, 4, 3, 2, 1].map((r) => (
              <button
                key={r}
                onClick={() => setFilterRating(r)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  filterRating === r
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface-container text-on-surface border-outline-variant"
                }`}
              >
                {r}★
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface-container rounded-xl border border-outline-variant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left px-4 py-3 text-on-surface-variant font-medium">Rating</th>
                <th className="text-left px-4 py-3 text-on-surface-variant font-medium">Comment</th>
                <th className="text-left px-4 py-3 text-on-surface-variant font-medium">Contact</th>
                <th className="text-left px-4 py-3 text-on-surface-variant font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-on-surface-variant">
                    No reviews yet.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.id} className="border-b border-outline-variant/50 hover:bg-surface-container-high/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex">{renderStars(review.rating)}</div>
                    </td>
                    <td className="px-4 py-3 text-on-surface max-w-xs truncate">
                      {review.comment || "—"}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {review.contactEmail || "—"}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
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
