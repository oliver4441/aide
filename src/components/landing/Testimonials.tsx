import Container from "@/components/ui/Container";

const featured = {
  quote:
    "When power or network drops on a busy Saturday, we used to lose track of half our sales. With Aide we keep serving customers, print receipts, and everything syncs the moment Wi-Fi is back.",
  name: "Wanjiku Mwangi",
  initials: "WM",
  role: "Owner, Ridgeways Beauty & Salon · Nairobi",
};

const supporting = [
  {
    quote:
      "Low-stock alerts save us every week. We reorder fast-moving drinks and groceries before shelves go empty, and M-Pesa totals match the till at close.",
    name: "Brian Ochieng",
    initials: "BO",
    role: "Manager, Lakeside Minimart · Kisumu",
  },
  {
    quote:
      "Setting up took one afternoon. My cashiers learned the POS in ten minutes, and I can check daily revenue and top items from my phone.",
    name: "Amina Hassan",
    initials: "AH",
    role: "Founder, Pwani Pharmacy · Mombasa",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="border-t border-rule py-14 sm:py-16 lg:py-20">
      <Container wide>
        <div className="mb-10 max-w-xl sm:mb-12">
          <p className="mb-4 font-display text-[10px] font-medium uppercase tracking-[.16em] text-accent">
            Trusted on the ground
          </p>
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-[-.05em] text-ink sm:text-4xl">
            Built for owners who cannot afford downtime.
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <article className="flex flex-col justify-between rounded-xl border border-rule bg-surface p-7 sm:p-10">
            <div>
              <span className="inline-block rounded-full border border-rule px-3 py-1 font-display text-[10px] uppercase tracking-[.12em] text-muted">
                Featured story
              </span>
              <blockquote className="mt-6 font-display text-xl font-medium leading-snug tracking-[-.03em] text-ink sm:text-2xl">
                &ldquo;{featured.quote}&rdquo;
              </blockquote>
            </div>
            <div className="mt-8 flex items-center gap-3.5 border-t border-rule pt-6">
              <div
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 font-display text-xs font-semibold text-accent"
              >
                {featured.initials}
              </div>
              <div>
                <p className="font-display text-sm font-semibold text-ink">{featured.name}</p>
                <p className="font-reading text-xs text-secondary">{featured.role}</p>
              </div>
            </div>
          </article>

          <div className="grid gap-6">
            {supporting.map((item) => (
              <article
                key={item.name}
                className="flex flex-col justify-between rounded-xl border border-rule bg-surface p-6 sm:p-7"
              >
                <blockquote className="font-reading text-sm leading-6 text-secondary sm:text-[15px]">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <div className="mt-6 flex items-center gap-3 border-t border-rule pt-5">
                  <div
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rule bg-ground font-display text-xs font-semibold text-ink"
                  >
                    {item.initials}
                  </div>
                  <div>
                    <p className="font-display text-sm font-semibold text-ink">{item.name}</p>
                    <p className="font-reading text-xs text-muted">{item.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
