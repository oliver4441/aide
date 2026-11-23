import type { Metadata } from "next";
import ChangelogClient from "@/app/changelog/ChangelogClient";

export const metadata = {
  title: "Desktop Changelog — Aide",
  description:
    "Release history and updates for Aide Desktop (Windows, macOS, Linux). View version changes, bug fixes, and new features.",
  openGraph: {
    title: "Aide Desktop Changelog",
    description: "All Aide Desktop releases with version, date, and platform support.",
    images: [{ url: "/og-desktop-changelog.jpg", width: 1200, height: 630, alt: "Aide Desktop Changelog" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aide Desktop Changelog",
    description: "All Aide Desktop releases with version, date, and platform support.",
    images: ["/og-desktop-changelog.jpg"],
  },
};

export default function DesktopChangelogPage() {
  return <ChangelogClient platform="desktop" />;
}