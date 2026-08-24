"use client";

const goals = [
  "Manage inventory & stock",
  "Process sales (POS)",
  "Track revenue & profits",
  "Print receipts",
  "Manage multiple businesses",
  "Work offline",
];

export default function GoalsStep({
  values,
  onToggle,
}: {
  values: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <h2 className="text-xl md:text-2xl font-headline font-bold text-on-surface text-center">
        What do you want to do with Aide?
      </h2>
      <p className="text-on-surface-variant text-sm text-center">
        Select all that apply.
      </p>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {goals.map((goal) => {
          const selected = values.includes(goal);
          return (
            <button
              key={goal}
              onClick={() => onToggle(goal)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                selected
                  ? "bg-primary text-on-primary border-primary shadow-lg shadow-primary/20"
                  : "bg-surface-container text-on-surface border-outline-variant hover:border-primary/50 hover:bg-surface-container-high"
              }`}
            >
              {goal}
            </button>
          );
        })}
      </div>
    </div>
  );
}
