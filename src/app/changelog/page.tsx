import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import ChangelogClient from "./ChangelogClient";

export const metadata: Metadata = {
  title: "Changelog — Aide",
  description:
    "Complete release history for Aide: PWA, Android and Desktop apps. Every version with notes, file sizes and SHA-256 checksums.",
  alternates: {
    canonical: `${SITE_URL}/changelog`,
  },
  openGraph: {
    title: "Changelog — Aide",
    description: "Complete release history for Aide across all platforms.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Aide changelog" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Changelog — Aide",
    description: "Complete release history for Aide across all platforms.",
    images: ["/og.jpg"],
  },
};

export default function ChangelogPage() {
  return <ChangelogClient />;
}