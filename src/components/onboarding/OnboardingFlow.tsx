"use client";

import { useEffect, useState } from "react";
import OnboardingModal from "./OnboardingModal";

export default function OnboardingFlow() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onboarded = localStorage.getItem("aide_onboarded");
    if (onboarded !== "true") {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return <OnboardingModal onClose={() => setShow(false)} />;
}
