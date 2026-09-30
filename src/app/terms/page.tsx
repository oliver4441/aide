import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service — Aide",
  description:
    "The terms that govern your use of Aide, the offline-first POS and business management app from OmixSystems. Covers your account, acceptable use, your data, payments, liability and termination.",
  alternates: { canonical: "https://aide.omixsystems.store/terms" },
  openGraph: {
    title: "Terms of Service — Aide",
    description: "The terms that govern your use of Aide.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Aide Terms of Service" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service — Aide",
    description: "The terms that govern your use of Aide.",
    images: ["/og.jpg"],
  },
};

const UPDATED = "30 September 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-on-surface font-headline">{title}</h2>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-on-surface-variant">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-outline-variant bg-surface/95 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Aide logo" className="w-8 h-8 rounded-lg object-cover shadow-sm" />
            <span className="text-lg font-bold text-primary font-headline">Aide</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface font-headline">Terms of Service</h1>
        <p className="mt-2 text-sm text-on-surface-variant">Last updated: {UPDATED}</p>
        <p className="mt-4 text-on-surface-variant">
          These Terms govern your use of Aide, the offline-first point-of-sale,
          inventory and reporting software provided by OmixSystems (&quot;Aide&quot;, &quot;the
          Service&quot;). By creating an account or using Aide, you agree to these Terms. If
          you do not agree, please do not use the Service.
        </p>

        <Section title="1. The Service">
          <p>
            Aide lets a business record products, take sales, produce receipts, track
            stock and generate reports. It is available as an installable web
            application (PWA), a native Android app, and a Windows desktop app. Aide is
            currently provided <strong>free of charge</strong> while it is in beta.
          </p>
        </Section>

        <Section title="2. Accounts">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>You must be at least 18 years old and legally able to enter a contract.</li>
            <li>You are responsible for keeping your sign-in credentials confidential and for all activity under your account.</li>
            <li>You must provide accurate registration details and keep them current.</li>
            <li>Tell us promptly if you suspect unauthorised access to your account.</li>
          </ul>
        </Section>

        <Section title="3. Your data and your rights">
          <p>
            You keep all ownership of the business data you enter into Aide. You grant
            us only the limited licence needed to host, process, back up and display
            that data back to you — for example, to sync it across your devices. We do
            not claim ownership of your sales figures, customer information or
            products.
          </p>
          <p>
            How we handle that data is set out in the{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            , which forms part of these Terms.
          </p>
        </Section>

        <Section title="4. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Use Aide for anything unlawful, or to facilitate harm to others.</li>
            <li>Attempt to gain access to another business&apos;s data, or to probe, scan or test the vulnerability of the Service without our written permission.</li>
            <li>Reverse engineer, decompile, or attempt to extract source code from the apps, except to the extent that such restriction is prohibited by law.</li>
            <li>Resell, sublicense or redistribute the Service as your own product.</li>
            <li>Transmit malware, or use automated systems to send bulk abusive traffic.</li>
            <li>Infringe the intellectual-property rights of others.</li>
          </ul>
        </Section>

        <Section title="5. Subscriptions and charges">
          <p>
            Aide is currently free while in beta. If we introduce paid plans, we will
            tell you the price and terms <strong>before</strong> they take effect, and
            you will have the opportunity to accept them. Any subscription you accept
            renews at the stated interval until cancelled, and you can cancel at any
            time from your account. We do not charge without your consent.
          </p>
        </Section>

        <Section title="6. Your responsibilities for your records">
          <p>
            Aide is a recording tool, not your accountant. You are responsible for the
            accuracy of the prices, tax settings, stock figures and receipts you enter,
            and for keeping your own records and complying with the tax and bookkeeping
            rules that apply to your business. We are not liable for business losses
            caused by incorrect data entry, forgotten backups, or reliance on Aide as
            your sole system of record.
          </p>
          <p>
            <strong>Back up your data.</strong> The Android app keeps its records on
            your device; uninstalling it removes that local copy. Use the in-app export
            tools and keep your own backups.
          </p>
        </Section>

        <Section title="7. Availability and offline operation">
          <p>
            Aide is designed to work without an internet connection, and much of it will
            continue to work during an outage. However, the Service is provided{" "}
            &quot;as is&quot; and we do not warrant uninterrupted or error-free operation.
            Cloud sync, sign-in and any server-generated features require connectivity.
          </p>
        </Section>

        <Section title="8. Our intellectual property">
          <p>
            Aide, including its software, design, branding and documentation, belongs to
            OmixSystems or its licensors. We grant you a personal, non-exclusive,
            non-transferable licence to use the Service as intended. These Terms grant
            no right to our trade marks beyond using the Service as a user.
          </p>
        </Section>

        <Section title="9. Third-party services">
          <p>
            Aide links to or relies on third-party services (for example hosting,
            database, and the live-chat widget on our marketing site). Their services
            are governed by their own terms, and we are not responsible for them.
          </p>
        </Section>

        <Section title="10. Disclaimers">
          <p>
            To the fullest extent permitted by law, the Service is provided &quot;as
            is&quot; and &quot;as available&quot;, without warranties of any kind, whether
            express or implied, including fitness for a particular purpose, accuracy of
            results, and non-infringement. We do not warrant that the Service will be
            uninterrupted, error-free, or that your data will never be lost.
          </p>
        </Section>

        <Section title="11. Limitation of liability">
          <p>
            To the fullest extent permitted by law, OmixSystems is not liable for lost
            profits, lost revenue, lost business, loss of goodwill, or any indirect or
            consequential loss arising from your use of the Service. Our total aggregate
            liability to you for all claims relating to the Service is limited to the
            greater of the amounts you have paid us in the twelve months before the
            claim, or one hundred Kenyan shillings (KES 100).
          </p>
          <p>
            Nothing in these Terms limits liability for death or personal injury caused
            by negligence, for fraud, or for anything that cannot lawfully be limited.
          </p>
        </Section>

        <Section title="12. Indemnity">
          <p>
            You agree to indemnify and hold harmless OmixSystems against any claim,
            demand, loss or expense (including reasonable legal fees) arising from your
            use of the Service, your breach of these Terms, or your violation of any
            law or the rights of a third party.
          </p>
        </Section>

        <Section title="13. Suspension and termination">
          <p>
            You may stop using Aide and delete your account at any time. We may suspend
            or terminate your access if you materially breach these Terms — for example
            by abusing the Service, attempting to access other tenants&apos; data, or
            using it unlawfully. Where practical we will warn you and give you a
            chance to fix the problem first.
          </p>
        </Section>

        <Section title="14. Changes to these Terms">
          <p>
            We may update these Terms. We will change the &quot;Last updated&quot; date
            above and, for changes that materially affect your rights, give you notice
            in the app or by email before they take effect. Continuing to use Aide after
            that notice means you accept the updated Terms.
          </p>
        </Section>

        <Section title="15. Governing law">
          <p>
            These Terms are governed by the laws of the Republic of Kenya, and the
            courts of Kenya have exclusive jurisdiction over any dispute arising from
            them. If you are a consumer, this does not remove the protection of any
            mandatory consumer protections available to you locally.
          </p>
        </Section>

        <Section title="16. Contact">
          <p>
            Questions about these Terms: contact OmixSystems at{" "}
            <a
              href="https://omixsystems.store"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              omixsystems.store
            </a>
            .
          </p>
        </Section>

        <div className="mt-12 pt-6 border-t border-outline-variant flex flex-col sm:flex-row gap-3">
          <Link
            href="/privacy"
            className="inline-flex items-center justify-center rounded-xl border border-outline-variant px-5 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors"
          >
            Read the Privacy Policy
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-light transition-colors"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
