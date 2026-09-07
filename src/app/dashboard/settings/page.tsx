import type { Metadata } from "next";
import SettingsPageInner from "./SettingsPageInner";

export const metadata: Metadata = {
  title: "Settings — Aide",
  description:
    "Manage your Aide business profile — name, type, currency, tax rate, receipt footer, categories, and sync conflicts.",
  openGraph: {
    title: "Aide — Settings",
    description: "Manage your business profile, categories, and sync.",
    images: [{ url: "/og-settings.jpg", width: 1200, height: 630, alt: "Aide settings" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aide — Settings",
    description: "Manage your business profile, categories, and sync.",
    images: ["/og-settings.jpg"],
  },
};

export default function SettingsPage() {
  return <SettingsPageInner />;
}
