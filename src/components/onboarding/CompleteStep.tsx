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
    <div className="flex flex-col items-center gap-6 w-full text-center">
      <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center">
        <svg className="w-8 h-8 text-on-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-xl md:text-2xl font-headline font-bold text-on-surface">
        All set! You&apos;re ready to go.
      </h2>
      <div className="bg-surface-container rounded-xl p-5 border border-outline-variant w-full max-w-sm text-left space-y-3">
        <div>
          <span className="text-xs text-on-surface-variant uppercase tracking-wider">Source</span>
          <p className="text-on-surface font-medium text-sm">{source}</p>
        </div>
        <div className="border-t border-outline-variant pt-3">
          <span className="text-xs text-on-surface-variant uppercase tracking-wider">Goals</span>
          <ul className="text-on-surface font-medium text-sm list-disc list-inside">
            {goals.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
        <div className="border-t border-outline-variant pt-3">
          <span className="text-xs text-on-surface-variant uppercase tracking-wider">Business Type</span>
          <p className="text-on-surface font-medium text-sm">{businessType}</p>
        </div>
      </div>
      <button
        onClick={onDone}
        className="mt-2 bg-primary text-on-primary font-semibold py-3 px-10 rounded-xl hover:bg-primary-light transition-colors shadow-lg shadow-primary/20 text-sm"
      >
        Start Using Aide
      </button>
    </div>
  );
}
