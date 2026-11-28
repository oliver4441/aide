import Link from "next/link";
import Container from "@/components/ui/Container";
import ScrollFadeIn from "@/components/landing/ScrollFadeIn";

export default function CtaSection() {
  return (
    <section className="relative overflow-hidden border-t border-rule bg-surface py-20 sm:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2e5bff]/[0.11] blur-[120px]"
      />
      <Container wide className="relative">
        <ScrollFadeIn>
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <p className="mb-4 font-display text-[10px] font-medium uppercase tracking-[.16em] text-accent">
              Ready when you are
            </p>
            <h2 className="text-balance font-display text-3xl font-semibold leading-tight tracking-[-.05em] text-ink sm:text-5xl">
              Run your counter without waiting on the network.
            </h2>
            <p className="mt-4 max-w-xl text-pretty font-reading text-base leading-7 text-secondary">
              Open Aide in your browser or install it on your device in minutes. No credit
              card required to start.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3.5 font-display text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
              >
                Start free <span aria-hidden="true">↗</span>
              </Link>
              <Link
                href="/downloads"
                className="inline-flex items-center justify-center rounded-full border border-rule bg-ground px-7 py-3.5 font-display text-sm font-medium text-ink transition hover:border-ink/40 hover:bg-[#1b1e24] active:scale-[0.98]"
              >
                Download app
              </Link>
            </div>
          </div>
        </ScrollFadeIn>
      </Container>
    </section>
  );
}
