import Container from "@/components/ui/Container";

const businessTypes = ["Salon", "Grocery", "Pharmacy", "Electronics", "Restaurant", "Clothing"];

export default function SocialProof() {
  return (
    <section className="border-y border-outline-variant py-16">
      <Container wide className="text-center">
        <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
          Built for all business types
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
          {businessTypes.map((type) => (
            <span
              key={type}
              className="rounded-full border border-outline-variant bg-surface-container-low px-4 py-2 text-sm font-medium text-on-surface-variant"
            >
              {type}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}
