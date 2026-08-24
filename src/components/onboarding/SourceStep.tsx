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
    <div className="flex flex-col items-center gap-6 w-full">
      <h2 className="text-xl md:text-2xl font-headline font-bold text-on-surface text-center">
        Where did you hear about us?
      </h2>
      <p className="text-on-surface-variant text-sm text-center">
        Help us understand how you found Aide.
      </p>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {sources.map((src) => (
          <button
            key={src}
            onClick={() => onSelect(src)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border ${
              value === src
                ? "bg-primary text-on-primary border-primary shadow-lg shadow-primary/20"
                : "bg-surface-container text-on-surface border-outline-variant hover:border-primary/50 hover:bg-surface-container-high"
            }`}
          >
            {src}
          </button>
        ))}
      </div>
    </div>
  );
}
