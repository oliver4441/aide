import Container from "@/components/ui/Container";

const businessTypes = ["Salon", "Grocery", "Pharmacy", "Electronics", "Restaurant", "Clothing"];

export default function SocialProof() {
  return (
    <section className="border-y border-rule py-16">
      <Container wide className="text-center">
        <p className="mb-6 text-xs font-display font-black uppercase tracking-widest text-secondary">
          Built for all business types
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
          {businessTypes.map((type) => (
            <span
              key={type}
              className="border border-rule bg-ground px-4 py-2 text-sm font-display font-black text-secondary"
            >
              {type}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}