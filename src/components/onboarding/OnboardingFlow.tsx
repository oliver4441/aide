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

  // Mark onboarding as done on ANY exit path — completing the tour, tapping
  // Skip, or pressing Escape. Previously only the final "Done" click set the
  // flag, so skipping the tour brought it back on every login.
  const handleClose = () => {
    if (storageKey) {
      localStorage.setItem(storageKey, "true");
    }
    setShow(false);
  };

  return <OnboardingModal storageKey={storageKey} onClose={handleClose} />;
}
