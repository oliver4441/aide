"use client";

export default function ContactSection() {
  const openChat = () => {
    if (typeof window !== "undefined" && (window as any).Tawk_API) {
      (window as any).Tawk_API.maximize();
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-bold text-on-surface font-headline mb-6">
        Contact & Support
      </h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Live Chat */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-6">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-on-surface font-semibold mb-2">Chat with us live</h3>
          <p className="text-on-surface-variant text-sm mb-4">
            Get instant help from our support team.
          </p>
          <button
            onClick={openChat}
            className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-light transition-colors"
          >
            Start Chat
          </button>
        </div>

        {/* Email */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-6">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-on-surface font-semibold mb-2">Email support</h3>
          <p className="text-on-surface-variant text-sm mb-4">
            We typically respond within 24 hours.
          </p>
          <a
            href="mailto:support@omixsystems.store"
            className="inline-block bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-light transition-colors"
          >
            Send Email
          </a>
        </div>
      </div>
    </section>
  );
}
