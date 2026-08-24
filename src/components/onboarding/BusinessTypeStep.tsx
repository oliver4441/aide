"use client";

const types = [
  "Salon / Beauty",
  "Grocery / Supermarket",
  "Electronics",
  "Restaurant / Café",
  "Pharmacy",
  "Clothing / Fashion",
  "General Shop",
  "Other",
];

export default function BusinessTypeStep({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <h2 className="text-xl md:text-2xl font-headline font-bold text-on-surface text-center">
        What type of business are you?
      </h2>
      <p className="text-on-surface-variant text-sm text-center">
        Pick the category that best describes your business.
      </p>
      <div className="grid grid-cols-2 gap-3 mt-2 w-full max-w-md">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => onSelect(t)}
            className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border text-center ${
              value === t
                ? "bg-primary text-on-primary border-primary shadow-lg shadow-primary/20"
                : "bg-surface-container text-on-surface border-outline-variant hover:border-primary/50 hover:bg-surface-container-high"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
