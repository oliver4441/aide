import Container from "@/components/ui/Container";

const businessTypes = ["Salon", "Grocery", "Pharmacy", "Electronics", "Restaurant", "Clothing"];

export default function SocialProof() {
  return <section className="border-t border-rule py-7 sm:py-8">
    <Container wide>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between sm:gap-8">
        <p className="shrink-0 font-display text-[10px] font-medium uppercase tracking-[.16em] text-secondary">Built for all business types</p>
        <div className="grid w-full grid-cols-3 items-center gap-x-5 gap-y-4 sm:flex sm:w-auto sm:flex-1 sm:justify-between sm:gap-5">
          {businessTypes.map((type, i) => <span key={type} className="flex items-center justify-center gap-2 whitespace-nowrap font-display text-xs font-semibold tracking-[-.02em] text-[#858e99] sm:text-[13px]"><span aria-hidden className="text-[13px] text-[#58616c]">{["✳", "▦", "✚", "◈", "◉", "▤"][i]}</span>{type}</span>)}
        </div>
      </div>
    </Container>
  </section>;
}
