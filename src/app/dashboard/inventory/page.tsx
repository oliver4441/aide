import type { Metadata } from "next";
import InventoryPageInner from "./InventoryPageInner";

export const metadata: Metadata = {
  title: "Inventory — Aide",
  description:
    "Aide inventory: products, stock levels, low-stock alerts and categories — stored locally on this device and synced when online.",
};

export default function InventoryPage() {
  return <InventoryPageInner />;
}
