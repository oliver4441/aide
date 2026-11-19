import type { Metadata } from "next";
import InvoicesPageInner from "./InvoicesPageInner";

export const metadata: Metadata = {
  title: "Invoices — Aide",
  description: "Create and track customer invoices.",
};

export default function InvoicesPage() {
  return <InvoicesPageInner />;
}
