import type { Metadata } from "next";
import AdminReviewsPageInner from "./AdminReviewsPageInner";

export const metadata: Metadata = {
  title: "Reviews — Aide Admin",
  description: "Customer feedback and ratings across Aide businesses.",
};

export default function AdminReviewsPage() {
  return <AdminReviewsPageInner />;
}
