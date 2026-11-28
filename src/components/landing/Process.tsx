import Container from "@/components/ui/Container";
import ScrollFadeIn from "@/components/landing/ScrollFadeIn";

const steps = [
  { number: "01", title: "Add your products", description: "Set up your catalogue, prices and opening stock. Organize items into the categories that make sense for your business." },
  { number: "02", title: "Ring up a sale", description: "Build a cart, choose cash, M-Pesa or card, then complete the sale. Aide records it and adjusts your stock." },
  { number: "03", title: "Reconnect and sync", description: "Keep working through an internet outage. When you are back online, Aide syncs pending changes with your account." },
];

export default function Process() {
  return <section id="how-it-works" className="border-t border-rule py-14 sm:py-16 lg:py-20">
    <Container wide>
      <ScrollFadeIn>
        <div className="mx-auto mb-10 max-w-xl text-center sm:mb-12"><p className="mb-4 font-display text-[10px] font-medium uppercase tracking-[.16em] text-accent">A simple start</p><h2 className="text-balance font-display text-3xl font-semibold tracking-[-.05em] text-ink sm:text-4xl">Up and running in three steps</h2><p className="mt-4 text-pretty font-reading text-sm leading-6 text-secondary">Set up once, serve customers anywhere, and let your work catch up when you reconnect.</p></div>
      </ScrollFadeIn>
      <ScrollFadeIn delay={0.08}>
        <div className="relative grid gap-8 md:grid-cols-3 md:gap-6">
          <div aria-hidden="true" className="absolute left-[16.5%] right-[16.5%] top-5 hidden border-t border-dashed border-[#343a45] md:block" />
          {steps.map((step) => <article key={step.number} className="relative rounded-xl border border-rule bg-[#14161a] p-6 transition duration-300 hover:border-ink/25 sm:p-7">
            <div className="mb-6 flex items-center justify-between"><span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#303642] bg-[#14161a] font-display text-xs font-semibold tabular-nums text-accent">{step.number}</span><span className="font-display text-[10px] uppercase tracking-[.12em] text-[#67717c]">Step {step.number}</span></div>
            <h3 className="font-display text-lg font-semibold tracking-[-.03em] text-ink">{step.title}</h3><p className="mt-3 font-reading text-sm leading-6 text-secondary">{step.description}</p>
          </article>)}
        </div>
      </ScrollFadeIn>
    </Container>
  </section>;
}
