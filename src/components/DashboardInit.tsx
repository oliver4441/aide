"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { seedFromSession } from "@/lib/sync";
import db from "@/lib/db";

export default function DashboardInit() {
  const { data: session, status } = useSession();
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || status !== "authenticated" || !session?.user) return;

    const sessionBusinessId = (session.user as any).businessId as string | null | undefined;
    const storedBusinessId = localStorage.getItem("aide_business_id");
    const businessId = sessionBusinessId || storedBusinessId;
    if (!businessId) return;

    seeded.current = true;

    (async () => {
      try {
        // If switching accounts on the same browser, clear the previous tenant's
        // IndexedDB records before seeding the authenticated user's business.
        if (sessionBusinessId && storedBusinessId && storedBusinessId !== sessionBusinessId) {
          await Promise.all([
            db.products.clear(),
            db.categories.clear(),
            db.sales.clear(),
            db.saleItems.clear(),
            db.businesses.clear(),
            db.syncQueue.clear(),
            db.syncConflicts.clear(),
            db.accounts.clear(),
            db.journalEntries.clear(),
            db.journalLines.clear(),
            db.customers.clear(),
            db.invoices.clear(),
            db.invoiceLines.clear(),
            db.paymentAllocations.clear(),
            db.suppliers.clear(),
            db.purchaseOrders.clear(),
            db.purchaseOrderLines.clear(),
            db.supplierInvoices.clear(),
            db.stockAdjustments.clear(),
            db.stockAdjustmentLines.clear(),
            db.refunds.clear(),
            db.refundLines.clear(),
            db.cashierShifts.clear(),
            db.splitPayments.clear(),
            db.employees.clear(),
            db.invitations.clear(),
          ]);
          await seedFromSession(sessionBusinessId);
          return;
        }

        const existing = await db.businesses.count();
        if (existing === 0) {
          await seedFromSession(businessId);
        } else {
          localStorage.setItem("aide_business_id", businessId);
        }
      } catch (err) {
        console.error("DashboardInit seed failed:", err);
      }
    })();
  }, [status, session]);

  return null;
}
