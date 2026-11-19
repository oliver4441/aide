import type { Metadata } from "next";
import SuppliersPageInner from "./SuppliersPageInner";

export const metadata: Metadata = {
  title: "Suppliers — Aide",
  description: "Manage suppliers, purchase orders, and accounts payable.",
};

export default function SuppliersPage() {
  return <SuppliersPageInner />;
}
