import type { Metadata } from "next";
import CustomersPageInner from "./CustomersPageInner";

export const metadata: Metadata = {
  title: "Customers — Aide",
  description: "Manage customers, credit limits, and outstanding balances.",
};

export default function CustomersPage() {
  return <CustomersPageInner />;
}
