"use client";

export default function CompleteStep({
  source,
  goals,
  businessType,
  onDone,
}: {
  source: string;
  goals: string[];
  businessType: string;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 w-full text-center font-reading">
      <div className="w-16 h-16 border border-ink bg-ground flex items-center justify-center">
        <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="font-display text-xl md:text-2xl font-black text-ink">
        All set! You&apos;re ready to go.
      </h2>
      <div className="border border-rule p-5 bg-ground w-full max-w-sm text-left space-y-3">
        <div>
          <span className="font-display text-xs font-black uppercase tracking-wider text-secondary">Source</span>
          <p className="font-display text-sm text-ink">{source}</p>
        </div>
        <div className="border-t border-rule pt-3">
          <span className="font-display text-xs font-black uppercase tracking-wider text-secondary">Goals</span>
          <ul className="font-display text-sm text-ink list-disc list-inside">
            {goals.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
        <div className="border-t border-rule pt-3">
          <span className="font-display text-xs font-black uppercase tracking-wider text-secondary">Business Type</span>
          <p className="font-display text-sm text-ink">{businessType}</p>
        </div>
      </div>
      <button
        onClick={onDone}
        className="mt-2 border border-ink bg-ink text-ground font-display font-black py-3 px-10 hover:bg-ground hover:text-ink text-sm"
      >
        Start Using Aide
      </button>
    </div>
  );
}