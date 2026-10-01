import type { Metadata } from "next";
import DownloadsClient from "./DownloadsClient";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Download Aide — PWA & Android APK",
  description:
    "Download the Aide Android APK, see every published version with file sizes and SHA-256 checksums, and follow step-by-step install instructions. iOS and desktop users can install Aide as a PWA from the browser.",
  alternates: {
    canonical: `${SITE_URL}/downloads`,
  },
  openGraph: {
    title: "Download Aide — PWA & Android APK",
    description: "Get Aide as an installable PWA, an Android APK, with verified SHA-256 checksums.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Aide — Download" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Download Aide — PWA & Android APK",
    description: "Get Aide as an installable PWA, an Android APK, with verified SHA-256 checksums.",
    images: ["/og.jpg"],
  },
};

export default function DownloadsPage() {
  return <DownloadsClient />;
}
