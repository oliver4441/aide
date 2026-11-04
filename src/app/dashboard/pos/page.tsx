import type { Metadata } from "next";
import POSPageInner from "./POSPageInner";

export const metadata: Metadata = {
  title: "New Sale — Aide",
  description:
    "Ring up a sale in Aide: tap products, take cash, mobile money or card, and share or print the receipt. Works offline.",
};

export default function POSPage() {
  return <POSPageInner />;
}
