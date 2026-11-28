import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { SITE_URL, COMPANY_NAME, COMPANY_URL, SUPPORT_EMAIL } from "@/lib/site";
import LandingFooter from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Aide collects, stores, syncs and protects your data. Covers on-device storage, cloud sync, Google sign-in, third-party processors, your rights under Kenyan law, and how to delete your data.",
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: {
    title: "Privacy Policy — Aide",
    description: "How Aide collects, stores, syncs and protects your data.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Aide Privacy Policy" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy — Aide",
    description: "How Aide collects, stores, syncs and protects your data.",
    images: ["/og.jpg"],
  },
};

const UPDATED = "28 November 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 border-t border-rule pt-8">
      <h2 className="font-display text-xl font-bold tracking-tight text-ink">{title}</h2>
      <div className="mt-3 space-y-3 font-reading text-[16px] leading-[1.7] text-secondary">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-ground text-ink">
      <header className="sticky top-0 z-40 border-b border-rule bg-ground/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5 md:px-8">
          <Link
            href="/"
            aria-label="Aide home"
            className="font-display text-[22px] font-bold tracking-[-0.06em] text-ink no-underline hover:no-underline"
          >
            Aide<span className="text-accent">.</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/docs"
              className="hidden rounded-full px-3.5 py-2 font-display text-[13px] text-secondary transition hover:text-ink sm:inline-flex"
            >
              Docs
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-rule px-4 py-2 font-display text-[13px] font-medium text-ink transition hover:border-ink/40"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-16">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          Legal
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink md:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted">Last updated: {UPDATED}</p>

        <p className="mt-5 font-reading text-[16px] leading-[1.7] text-secondary">
          {COMPANY_NAME} (&quot;we&quot;, &quot;us&quot;) operates Aide, an offline-first
          point-of-sale, inventory, and business accounting application. This policy
          explains what data Aide handles, why, and the choices you have. It applies to
          the Aide web app (PWA), the Android app, and the desktop apps (Windows, macOS,
          and Linux).
        </p>

        <div className="mt-8 rounded-2xl border border-rule bg-surface p-6">
          <h2 className="font-display text-base font-bold text-ink">1. The short version</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 font-reading text-[15px] leading-relaxed text-secondary">
            <li>
              Your sales, inventory, and business records are stored{" "}
              <strong className="text-ink">on your device first</strong>, and only synced
              to our servers when you are online and signed in (the Android APK is
              local-only).
            </li>
            <li>
              We never sell your data, and we do not use your business data to train AI
              models or for advertising.
            </li>
            <li>
              You can export or delete your data at any time from inside the app.
            </li>
          </ul>
        </div>

        <Section title="2. Who is responsible">
          <p>
            Aide is operated by <strong className="text-ink">{COMPANY_NAME}</strong>, a
            software company registered in the Republic of Kenya.
          </p>
          <ul className="mt-3 space-y-1.5">
            <li>
              <span className="font-semibold text-ink">Email:</span>{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </li>
            <li>
              <span className="font-semibold text-ink">Phone:</span>{" "}
              <a href="tel:+254768213649" className="text-accent hover:underline">
                +254 768 213 649
              </a>
            </li>
            <li>
              <span className="font-semibold text-ink">Website:</span>{" "}
              <a
                href={COMPANY_URL}
                className="text-accent hover:underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                omixsystems.store
              </a>
            </li>
          </ul>
          <p className="mt-3">
            Use the email address above for any privacy question, access request, or
            erasure request. We will respond to verifiable requests.
          </p>
        </Section>

        <Section title="3. Data we collect">
          <h3 className="font-display font-semibold text-ink">Account and team information</h3>
          <p>
            When you create an account with email and password, we collect your name,
            email address, and a securely hashed password (never stored in plain text).
            If you choose <strong className="text-ink">Continue with Google</strong>, we
            receive your name and email address from Google to create or sign into your
            account. We also record which business or businesses you belong to, your
            assigned role template, and any team invitations you send or accept.
          </p>

          <h3 className="font-display font-semibold text-ink">Business data you enter or import</h3>
          <p>
            Everything you create or import in Aide — products, categories, stock levels
            and adjustments, sales, receipts, refunds, shifts and cash drawers,
            customers, suppliers, invoices, purchase orders, imported CSV/Excel files,
            journal entries, fixed assets, business profile, tax rate, and receipt
            settings — is your data. We process it solely to store it, sync it between
            your devices, and display it back to you.
          </p>

          <h3 className="font-display font-semibold text-ink">Audit and technical data</h3>
          <p>
            When you use team and accounting features, Aide records business audit events
            (such as who performed sensitive actions and when) scoped to your business.
            Our servers and error-monitoring tools also process basic request and
            diagnostic information (IP address, browser or app version, device type,
            timestamps, and crash traces) to deliver the app, prevent automated abuse,
            and fix bugs. We do not build advertising profiles.
          </p>
        </Section>

        <Section title="4. Where your data lives">
          <h3 className="font-display font-semibold text-ink">On your device</h3>
          <p>
            Aide is offline-first. In the web app (PWA) and desktop apps, your data is
            stored locally in IndexedDB so the point of sale works with no internet
            connection. In the native Android app, your data is stored in an on-device
            Room database with no cloud sync.
          </p>
          <p>
            <strong className="text-ink">Consequence worth understanding:</strong> on the
            Android app, uninstalling the app deletes its local database. Export anything
            you need to keep first. The signed-in web and desktop apps keep a server copy
            that syncs across your authorised devices.
          </p>

          <h3 className="font-display font-semibold text-ink">On our servers</h3>
          <p>
            If you sign in on the web or desktop app, your account and synced business
            data are stored in a PostgreSQL database hosted with Neon. Every data request
            is authenticated and verified against your business membership and role
            permissions, so one business can never read or modify another&apos;s records.
          </p>
        </Section>

        <Section title="5. Third parties we use">
          <p>
            We use a small number of infrastructure and security providers. None of them
            receive your business data for advertising or AI training:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-ink">Vercel</strong> — hosts the web application and
              API routes.
            </li>
            <li>
              <strong className="text-ink">Neon</strong> — hosts the PostgreSQL database
              holding synced account and business data.
            </li>
            <li>
              <strong className="text-ink">Google (OAuth &amp; Fonts)</strong> — provides
              optional Google sign-in if you choose it, and supplies web fonts when pages
              load.
            </li>
            <li>
              <strong className="text-ink">Cloudflare Turnstile</strong> — protects web
              sign-in and registration forms from bots and automated abuse.
            </li>
            <li>
              <strong className="text-ink">Sentry</strong> — captures application errors
              and performance diagnostics so we can identify and fix bugs.
            </li>
            <li>
              <strong className="text-ink">GitHub</strong> — hosts the source repository
              and published Android and desktop release builds.
            </li>
            <li>
              <strong className="text-ink">Tawk.to</strong> — provides the live-chat
              widget on our public marketing site. If you use the chat widget, Tawk
              processes chat content and standard visitor metadata (such as IP address
              and page viewed).
            </li>
          </ul>
        </Section>

        <Section title="6. Cookies and local storage">
          <p>
            Aide uses essential session tokens to keep you signed in and enforce role
            access. We do not use advertising or cross-site tracking cookies. Your theme
            preference, onboarding state, and notification preferences are stored in your
            browser&apos;s local storage on your device.
          </p>
        </Section>

        <Section title="7. Your choices and rights">
          <p>
            Under the Kenya Data Protection Act, 2019, you have rights over your personal
            data. You can exercise them from inside Aide:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-ink">Access and export</strong> —{" "}
              <span className="text-ink">Settings → Export All Data</span> and{" "}
              <span className="text-ink">Sales History</span> let you download copies of
              your records in CSV or JSON.
            </li>
            <li>
              <strong className="text-ink">Correction</strong> — edit products,
              customers, sales, and business settings directly in the app.
            </li>
            <li>
              <strong className="text-ink">Deletion</strong> —{" "}
              <span className="text-ink">Settings</span> offers a delete option for your
              business, and you can revoke team member access or ask us to delete your
              account entirely.
            </li>
            <li>
              <strong className="text-ink">Withdraw consent / object</strong> — stop
              syncing by signing out, or contact us directly.
            </li>
          </ul>
          <p>
            To have your account and synced data erased from our servers, email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent hover:underline">
              {SUPPORT_EMAIL}
            </a>
            . We will verify your request and confirm the deletion with you.
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            Passwords are bcrypt-hashed before storage. All traffic is served over HTTPS.
            Data access is authenticated and scoped by business membership and role
            permissions, and web sign-in/signup is protected against automated abuse.
            Shared customer receipts use unguessable signed tokens and omit cost, margin,
            and internal notes. No system is perfectly secure, but we design and operate
            Aide with reasonable technical and organisational safeguards.
          </p>
        </Section>

        <Section title="9. Children">
          <p>
            Aide is a business tool and is not directed at children. We do not knowingly
            collect data from anyone under 18.
          </p>
        </Section>

        <Section title="10. Changes to this policy">
          <p>
            If we change this policy in a way that affects your rights, we will update
            the &quot;Last updated&quot; date above and, for material changes, notify you
            in the app or by email before the change takes effect.
          </p>
        </Section>

        <div className="mt-12 flex flex-col gap-3 border-t border-rule pt-8 sm:flex-row">
          <Link
            href="/terms"
            className="inline-flex items-center justify-center rounded-full border border-rule px-6 py-2.5 font-display text-sm font-semibold text-ink transition hover:border-ink/40"
          >
            Read the Terms of Service
          </Link>
          <Link
            href="/docs/getting-started/new-user-guide"
            className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-2.5 font-display text-sm font-semibold text-white transition hover:brightness-110"
          >
            Read the New User Guide
          </Link>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
