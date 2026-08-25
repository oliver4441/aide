"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import OnboardingModal from "./OnboardingModal";

export default function OnboardingFlow() {
  const { data: session, status } = useSession();
  const [show, setShow] = useState(false);
  const [storageKey, setStorageKey] = useState("");

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const email = (session.user as any)?.email || "unknown";
    const key = `aide_onboarded_${email}`;
    setStorageKey(key);
    if (localStorage.getItem(key) !== "true") {
      setShow(true);
    }
  }, [status, session]);

  if (!show) return null;

  return <OnboardingModal storageKey={storageKey} onClose={() => setShow(false)} />;
}
