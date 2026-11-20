"use client";

import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_HREF } from "@/lib/site";

export default function ContactSection() {
  const openChat = () => {
    if (typeof window !== "undefined" && (window as any).Tawk_API) {
      (window as any).Tawk_API.maximize();
    }
  };

  return (
    <section className="font-reading">
      <h2 className="font-display text-2xl font-black text-ink mb-6">
        Contact & Support
      </h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Live Chat */}
        <div className="border border-rule p-6 bg-ground">
          <div className="w-10 h-10 border border-rule bg-accent/20 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="font-display font-black text-ink mb-2">Chat with us live</h3>
          <p className="text-secondary text-sm mb-4">
            Get instant help from our support team.
          </p>
          <button
            onClick={openChat}
            className="np-btn np-btn--accent text-sm px-4 py-2"
          >
            Start Chat
          </button>
        </div>

        {/* Email */}
        <div className="border border-rule p-6 bg-ground">
          <div className="w-10 h-10 border border-rule bg-accent/20 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-display font-black text-ink mb-2">Email support</h3>
          <p className="text-secondary text-sm mb-4">
            {SUPPORT_EMAIL} — we typically respond within 24 hours.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="np-btn text-sm px-4 py-2"
          >
            Send Email
          </a>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-display text-secondary">
          <span>Phone</span>
          <a href={SUPPORT_PHONE_HREF} className="font-black text-ink hover:underline">
            {SUPPORT_PHONE}
          </a>
        </div>
      </div>
    </section>
  );
}
