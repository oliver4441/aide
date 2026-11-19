import type { Metadata } from "next";
import RefundsPageInner from "./RefundsPageInner";

export const metadata: Metadata = {
  title: "Refunds — Aide",
  description: "Process and track refunds for previous sales.",
};

export default function RefundsPage() {
  return <RefundsPageInner />;
}
