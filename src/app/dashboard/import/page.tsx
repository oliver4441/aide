import type { Metadata } from "next";
import ImportPageInner from "./ImportPageInner";

export const metadata: Metadata = {
  title: "Data Import — Aide",
  description:
    "Import historical business data from CSV or Excel: products, stock levels and customers — with column mapping, dry-run validation, duplicate detection and one-click undo.",
};

export default function ImportPage() {
  return <ImportPageInner />;
}
