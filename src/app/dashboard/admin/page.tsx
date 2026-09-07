import type { Metadata } from "next";
import AdminPageInner from "./AdminPageInner";

export const metadata: Metadata = {
  title: "Admin Console — Aide",
  description:
    "Aide platform admin console — view businesses, users, sales, revenue, reviews, and product counts.",
  openGraph: {
    title: "Aide — Admin Console",
    description: "Platform management dashboard.",
    images: [{ url: "/og-admin.jpg", width: 1200, height: 630, alt: "Aide admin" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aide — Admin Console",
    description: "Platform management dashboard.",
    images: ["/og-admin.jpg"],
  },
};

export default function AdminPage() {
  return <AdminPageInner />;
}
