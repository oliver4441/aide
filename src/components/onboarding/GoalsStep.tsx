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
    <div className="flex flex-col items-center gap-6 w-full font-reading">
      <h2 className="font-display text-xl md:text-2xl font-black text-ink text-center">
        What do you want to do with Aide?
      </h2>
      <p className="text-secondary text-sm text-center">
        Select all that apply.
      </p>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {goals.map((goal) => {
          const selected = values.includes(goal);
          return (
            <button
              key={goal}
              onClick={() => onToggle(goal)}
              className={`px-5 py-2.5 text-sm font-display font-black border border-rule ${
                selected
                  ? "bg-ink text-ground"
                  : "text-secondary hover:text-ink bg-ground"
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