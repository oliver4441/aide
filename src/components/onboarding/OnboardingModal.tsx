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
    return (
      <div key={step} className="w-full font-display">
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ground/80 p-4">
      <div className="border border-rule bg-ground w-full max-w-lg overflow-hidden">
        <div className="p-4 border-b border-rule">
          <div className="flex items-center justify-center gap-2 font-display">
            {STEPS.map((_, i) => (
              <div key={i} className="flex items-center">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    i <= step ? "bg-ink" : "bg-rule"
                  }`}
                />
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 ${
                      i < step ? "bg-ink" : "bg-rule"
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
          <div className="p-4 border-t border-rule flex justify-between">
            <button
              onClick={step === 0 ? onClose : goPrev}
              className="px-4 py-2 text-sm font-display font-black text-secondary hover:text-ink"
            >
              {step === 0 ? "Skip" : "Back"}
            </button>
            <button
              onClick={goNext}
              disabled={!canAdvance}
              className="px-6 py-2 text-sm font-display font-black border border-ink bg-ink text-ground hover:bg-ground hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}