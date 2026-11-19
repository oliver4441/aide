import type { Metadata } from "next";
import ShiftsPageInner from "./ShiftsPageInner";

export const metadata: Metadata = {
  title: "Shifts — Aide",
  description: "Open and close cashier shifts, track cash drawer reconciliation.",
};

export default function ShiftsPage() {
  return <ShiftsPageInner />;
}
