import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — Aide",
  description:
    "How Aide collects, stores, syncs and protects your data. Covers on-device storage, cloud sync, third-party processors, your rights under Kenyan law, and how to delete your data.",
  alternates: { canonical: "https://aide.omixsystems.store/privacy" },
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

const UPDATED = "30 September 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-on-surface font-headline">{title}</h2>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-on-surface-variant">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
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
        <h1 className="text-3xl md:text-4xl font-bold text-on-surface font-headline">Privacy Policy</h1>
        <p className="mt-2 text-sm text-on-surface-variant">Last updated: {UPDATED}</p>
        <p className="mt-4 text-on-surface-variant">
          OmixSystems (&quot;we&quot;, &quot;us&quot;) operates Aide, an offline-first point-of-sale, inventory
          and reporting application. This policy explains what data Aide handles, why, and
          the choices you have. It applies to the Aide web app (PWA), the Android app, and
          the Windows desktop app.
        </p>

        <Section title="1. The short version">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Your sales and inventory data is stored <strong>on your device first</strong>, and only synced to our servers when you are online and signed in.</li>
            <li>We never sell your data, and we do not use your business data to train AI models or for advertising.</li>
            <li>You can export or delete your data at any time from inside the app.</li>
          </ul>
        </Section>

        <Section title="2. Who is responsible">
          <p>
            Aide is operated by OmixSystems, a software company registered in Kenya. For
            questions about this policy or your data, contact us at{" "}
            <a href="https://omixsystems.store" className="text-primary hover:underline" rel="noopener noreferrer" target="_blank">
              omixsystems.store
            </a>
            .
          </p>
        </Section>

        <Section title="3. Data we collect">
          <h3 className="font-semibold text-on-surface">Account information</h3>
          <p>
            When you create an account we collect your name, email address and a
            securely hashed password. We never store your password in plain text. We
            also record which business or businesses you belong to.
          </p>

          <h3 className="font-semibold text-on-surface">Business data you enter</h3>
          <p>
            Everything you create in Aide — products, categories, stock levels, sales,
            receipts, prices, profit figures, business name, tax rate and receipt
            settings — is your data. We process it solely to store it, sync it between
            your devices, and show it back to you.
          </p>

          <h3 className="font-semibold text-on-surface">Technical data</h3>
          <p>
            Our servers process basic request information (IP address, browser type,
            device type, timestamps) to deliver the app, keep it secure, and diagnose
            errors. We do not build advertising profiles.
          </p>
        </Section>

        <Section title="4. Where your data lives">
          <h3 className="font-semibold text-on-surface">On your device</h3>
          <p>
            Aide is offline-first. In the PWA, your data is stored locally in your
            browser (IndexedDB). In the Android app it is stored in an on-device
            database (Room). This local copy works with no internet connection.
          </p>
          <p>
            <strong>Consequence worth understanding:</strong> on the Android app, if you
            uninstall it, its local data is deleted. Export anything you need to keep
            first. The signed-in web app keeps a server copy that syncs across your
            devices.
          </p>

          <h3 className="font-semibold text-on-surface">On our servers</h3>
          <p>
            If you sign in, your account and business data are stored in a PostgreSQL
            database hosted with Neon. The app authenticates every data request and
            verifies that you are a member of the business being accessed, so one
            business can never read or modify another&apos;s records.
          </p>
        </Section>

        <Section title="5. Third parties we use">
          <p>We use a small number of service providers. None of them receive your business data.</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Vercel</strong> — hosts the web application.</li>
            <li><strong>Neon</strong> — hosts the PostgreSQL database holding synced account and business data.</li>
            <li><strong>GitHub</strong> — hosts the source repository and the published Android APK releases.</li>
            <li><strong>Google Fonts</strong> — supplies the web fonts; your browser requests these from Google when you load a page.</li>
            <li><strong>Tawk.to</strong> — provides the live-chat widget on our public marketing site. If you use the chat widget, Tawk processes chat content and the usual visitor data such as your IP address and page you were viewing. Chat is on the marketing site, not inside the signed-in app.</li>
          </ul>
        </Section>

        <Section title="6. Cookies">
          <p>
            Aide uses a single essential cookie-style session token to keep you signed
            in. We do not use advertising or cross-site tracking cookies. Your theme
            preference and notification settings are stored in your browser&apos;s local
            storage, not sent to us.
          </p>
        </Section>

        <Section title="7. Your choices and rights">
          <p>
            Under the Kenya Data Protection Act, 2019, you have rights over your personal
            data. You can exercise them from inside Aide:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Access and export</strong> — Settings → Export All Data downloads a copy of your records.</li>
            <li><strong>Correction</strong> — edit products, sales and business settings directly in the app.</li>
            <li><strong>Deletion</strong> — Settings offers a delete option for your business. You can also ask us to delete your account entirely.</li>
            <li><strong>Withdraw consent / object</strong> — stop syncing by signing out, or contact us.</li>
          </ul>
          <p>
            To have your account and synced data erased from our servers, contact us
            through the address above. We will confirm the deletion with you.
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            Passwords are hashed before storage. All traffic is served over HTTPS. Data
            access is authenticated and scoped so that a signed-in user can only reach
            businesses they are a member of. No system is perfectly secure, but we
            design and operate Aide with reasonable technical and organisational
            safeguards.
          </p>
        </Section>

        <Section title="9. Children">
          <p>
            Aide is a business tool and is not directed at children. We do not
            knowingly collect data from anyone under 18.
          </p>
        </Section>

        <Section title="10. Changes to this policy">
          <p>
            If we change this policy in a way that affects your rights, we will update
            the &quot;Last updated&quot; date above and, for material changes, notify you in
            the app or by email before the change takes effect.
          </p>
        </Section>

        <div className="mt-12 pt-6 border-t border-outline-variant flex flex-col sm:flex-row gap-3">
          <Link
            href="/terms"
            className="inline-flex items-center justify-center rounded-xl border border-outline-variant px-5 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors"
          >
            Read the Terms of Service
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
