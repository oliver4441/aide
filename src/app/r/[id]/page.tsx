import type { Metadata } from "next";

import { SITE_URL } from "@/lib/site";
import SharedReceiptPage from "./SharedReceiptPageClient";

/**
 * Per-sale permalinks, served to customers who scan the QR on a printed
 * receipt — so they are deliberately **not indexed** and deliberately kept out
 * of the sitemap, the same reasoning as `/dashboard`.
 *
 * The canonical used to be the bare `/r/`, which every receipt on the internet
 * pointed at and which itself 308s. It now points at the receipt being viewed.
 * That is only a hint, so `robots` does the real work: these pages have no
 * standalone value for a search engine and each one is somebody's transaction.
 */
export function generateMetadata({
  params,
}: {
  params: { id: string };
}): Metadata {
  const url = `${SITE_URL}/r/${params.id}`;
  return {
    title: "Your Receipt",
    description:
      "View and download your Aide receipt. Save as PDF, print, or share via QR code.",
    alternates: { canonical: url },
    robots: { index: false, follow: false },
    openGraph: {
      title: "Your Receipt — Aide",
      description: "View and download your Aide receipt.",
      images: [{ url: "/og-receipt.jpg", width: 1200, height: 630, alt: "Aide receipt" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Your Receipt — Aide",
      description: "View and download your Aide receipt.",
      images: ["/og-receipt.jpg"],
    },
  };
}

export default function SharedReceiptRoute({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { t?: string };
}) {
  return <SharedReceiptPage id={params.id} token={searchParams.t} />;
}
