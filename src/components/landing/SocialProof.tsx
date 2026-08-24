export default function SocialProof() {
  const businessTypes = ["Salon", "Grocery", "Pharmacy", "Electronics", "Restaurant", "Clothing"];

  return (
    <section className="border-y border-outline-variant py-8">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 text-center">
        <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-6 font-semibold">
          Built for all business types
        </p>
        <div className="flex flex-wrap justify-center items-center gap-3 md:gap-4">
          {businessTypes.map((type) => (
            <span
              key={type}
              className="px-4 py-2 rounded-full border border-outline-variant bg-surface-container-low text-sm font-medium text-on-surface-variant"
            >
              {type}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
