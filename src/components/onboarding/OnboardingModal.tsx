"use client";

import { useState, useEffect, useCallback } from "react";
import SourceStep from "./SourceStep";
import GoalsStep from "./GoalsStep";
import BusinessTypeStep from "./BusinessTypeStep";
import CompleteStep from "./CompleteStep";

const STEPS = ["source", "goals", "business", "complete"] as const;

export default function OnboardingModal({ storageKey, onClose }: { storageKey: string; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [source, setSource] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [businessType, setBusinessType] = useState("");

  const goNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setDirection("left");
      setStep((s) => s + 1);
    }
  }, [step]);

  const goPrev = useCallback(() => {
    if (step > 0) {
      setDirection("right");
      setStep((s) => s - 1);
    }
  }, [step]);

  useEffect(() => {
    if (step !== 0) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [step, onClose]);

  const toggleGoal = (g: string) => {
    setGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const handleDone = () => {
    localStorage.setItem(storageKey, "true");
    localStorage.setItem(
      `${storageKey}_prefs`,
      JSON.stringify({ source, goals, businessType })
    );
    onClose();
  };

  const canAdvance =
    (step === 0 && source) ||
    (step === 1 && goals.length > 0) ||
    (step === 2 && businessType) ||
    step === 3;

  const renderStep = () => {
    const animClass =
      direction === "left"
        ? "animate-slide-in-left"
        : "animate-slide-in-right";

    return (
      <div key={step} className={`w-full ${animClass}`}>
        {step === 0 && <SourceStep value={source} onSelect={setSource} />}
        {step === 1 && <GoalsStep values={goals} onToggle={toggleGoal} />}
        {step === 2 && (
          <BusinessTypeStep value={businessType} onSelect={setBusinessType} />
        )}
        {step === 3 && (
          <CompleteStep
            source={source}
            goals={goals}
            businessType={businessType}
            onDone={handleDone}
          />
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg border border-outline-variant overflow-hidden">
        <div className="p-4 border-b border-outline-variant">
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((_, i) => (
              <div key={i} className="flex items-center">
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i <= step ? "bg-primary" : "bg-outline-variant"
                  }`}
                />
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 transition-colors ${
                      i < step ? "bg-primary" : "bg-outline-variant"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 md:p-8 min-h-[320px] flex items-center justify-center">
          {renderStep()}
        </div>

        {step < 3 && (
          <div className="p-4 border-t border-outline-variant flex justify-between">
            <button
              onClick={step === 0 ? onClose : goPrev}
              className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
            >
              {step === 0 ? "Skip" : "Back"}
            </button>
            <button
              onClick={goNext}
              disabled={!canAdvance}
              className="px-6 py-2 rounded-xl text-sm font-semibold bg-primary text-on-primary hover:bg-primary-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
