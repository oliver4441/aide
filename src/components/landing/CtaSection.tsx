import Link from "next/link";
import Container from "@/components/ui/Container";

export default function CtaSection() {
  return (
    <section className="w-full bg-[#f5f6f7] py-20 text-[#0e1012] sm:py-24">
      <Container wide>
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <p className="mb-4 font-display text-[10px] font-medium uppercase tracking-[.16em] text-[#2e5bff]">
            Ready when you are
          </p>
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-[-.05em] text-[#0e1012] sm:text-5xl">
            Run your counter without waiting on the network.
          </h2>
          <p className="mt-4 max-w-xl font-reading text-base leading-7 text-[#4a525d]">
            Open Aide in your browser or install it on your device in minutes. No credit card required to start.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2e5bff] px-7 py-3.5 font-display text-sm font-semibold text-white transition hover:brightness-110"
            >
              Start free <span aria-hidden="true">↗</span>
            </Link>
            <Link
              href="/downloads"
              className="inline-flex items-center justify-center rounded-full border border-[#cfd5de] px-7 py-3.5 font-display text-sm font-medium text-[#0e1012] transition hover:bg-[#e6e9ee]"
            >
              Download app
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
