import type { Metadata } from "next";
import DownloadsClient from "./DownloadsClient";

export const metadata: Metadata = {
  title: "Download Aide — Android APK, versions & checksums",
  description:
    "Download the Aide Android APK, see every published version with file sizes and SHA-256 checksums, and follow step-by-step install instructions. iOS users can add Aide to the home screen.",
  openGraph: {
    title: "Download Aide — Android APK, versions & checksums",
    description: "Get the Aide Android APK with verified SHA-256 checksums and clear install steps.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Aide — Download" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Download Aide — Android APK, versions & checksums",
    description: "Get the Aide Android APK with verified SHA-256 checksums and clear install steps.",
    images: ["/og.jpg"],
  },
};

export default function DownloadsPage() {
  return <DownloadsClient />;
}
