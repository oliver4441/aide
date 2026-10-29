"use client";

const sources = [
  "Google Search",
  "Social Media",
  "Friend or Colleague",
  "App Store / Play Store",
  "YouTube",
  "Other",
];

export default function SourceStep({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 w-full font-reading">
      <h2 className="font-display text-xl md:text-2xl font-black text-ink text-center">
        Where did you hear about us?
      </h2>
      <p className="text-secondary text-sm text-center">
        Help us understand how you found Aide.
      </p>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {sources.map((src) => (
          <button
            key={src}
            onClick={() => onSelect(src)}
            className={`px-5 py-2.5 text-sm font-display font-black border border-rule ${
              value === src
                ? "bg-ink text-ground"
                : "text-secondary hover:text-ink bg-ground"
            }`}
          >
            {src}
          </button>
        ))}
      </div>
    </div>
  );
}