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
    <div className="flex flex-col items-center gap-6 w-full font-reading">
      <h2 className="font-display text-xl md:text-2xl font-black text-ink text-center">
        What type of business are you?
      </h2>
      <p className="text-secondary text-sm text-center">
        Pick the category that best describes your business.
      </p>
      <div className="grid grid-cols-2 gap-3 mt-2 w-full max-w-md">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => onSelect(t)}
            className={`px-4 py-3 text-sm font-display font-black border border-rule text-center ${
              value === t
                ? "bg-ink text-ground"
                : "text-secondary hover:text-ink bg-ground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}