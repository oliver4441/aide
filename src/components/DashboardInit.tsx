"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { seedFromSession, getSyncStatus } from "@/lib/sync";
import db from "@/lib/db";

export default function DashboardInit() {
  const { data: session, status } = useSession();
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || status !== "authenticated" || !session?.user) return;

    const { isOnline } = getSyncStatus();

    const businessId = (session.user as any).businessId || localStorage.getItem("aide_business_id");
    if (!businessId) return;

    seeded.current = true;

    // Seed Dexie from server on first load. The backfill runner re-queues
    // this when connectivity returns, so a temporary offline state here
    // doesn't leave the store empty.
    (async () => {
      try {
        const existing = await db.businesses.count();
        if (existing === 0) {
          await seedFromSession(businessId);
        } else {
          // Already seeded, just make sure business ID is set
          localStorage.setItem("aide_business_id", businessId);
        }
      } catch (err) {
        console.error("DashboardInit seed failed:", err);
      }
    })();
  }, [status, session]);

  return null;
}
