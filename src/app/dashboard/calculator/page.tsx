import type { Metadata } from "next";
import CalculatorPageInner from "./CalculatorPageInner";

export const metadata: Metadata = {
  title: "Calculator — Aide",
  description:
    "A quick, offline-friendly calculator inside Aide — chain operations, use the keyboard, and copy results straight into a sale.",
};

export default function CalculatorPage() {
  return <CalculatorPageInner />;
}
