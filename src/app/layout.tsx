import type { Metadata } from "next";
import Providers from "@/components/Providers";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { SITE_URL, COMPANY_NAME, SUPPORT_EMAIL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Aide — Offline-First POS, Inventory & Analytics for Kenyan Businesses",
    template: "%s | Aide",
  },
  description:
    "Aide is an offline-first POS, inventory and reporting app for salons, shops, restaurants and pharmacies. Sell on the POS, track stock, print receipts, and sync when online. Deployed in Kenya.",
  metadataBase: new URL("https://aide.omixsystems.store"),
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: "https://aide.omixsystems.store",
    siteName: "Aide — Business Management",
    title: "Aide — Offline-First POS, Inventory & Analytics",
    description:
      "Offline-first POS, inventory & reporting for Kenyan businesses. Works without internet, prints receipts, syncs when online.",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Aide — Offline-First Business Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aide — Offline-First POS, Inventory & Analytics",
    description:
      "Offline-first POS, inventory & reporting for Kenyan businesses. Works without internet, prints receipts, syncs when online.",
    images: ["/og.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon.jpg", type: "image/jpeg", sizes: "192x192" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aide",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#0e1012",
    "msapplication-tap-highlight": "no",
    "theme-color": "#0e1012",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0e1012",
};

// Sign-in is email + password handled by NextAuth (see src/lib/auth.ts).

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" id="theme-color" content="#0e1012" />
        {/*
          Runs before the body paints. Dark mode is forced site-wide:
          html.dark and color-scheme: dark are always applied regardless of
          localStorage or system preference.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var e=document.documentElement;e.classList.add("dark");e.style.colorScheme="dark";var m=document.getElementById("theme-color");if(m)m.setAttribute("content","#0e1012");})();`,
          }}
        />
        <link rel="icon" type="image/jpeg" href="/logo.jpg" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Host+Grotesk:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet" />
        <meta name="application-name" content="Aide" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Aide" />
        <meta name="msapplication-TileColor" content="#0e1012" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              // Position the widget at the right-center ("equator") of the mobile
              // view so it clears the fixed bottom nav bar. Desktop stays bottom-right.
              var Tawk_API=Tawk_API||{};
              Tawk_API.customStyle = {
                visibility: {
                  desktop: { position: 'br', xOffset: 8, yOffset: 96 },
                  mobile:  { position: 'cr', xOffset: 8, yOffset: 0 },
                },
              };
              (function(){
              var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
              s1.async=true;
              s1.src='https://embed.tawk.to/6a8cb4dd5d2e28344928661b/1k0qq50lj';
              s1.charset='UTF-8';
              s1.setAttribute('crossorigin','*');
              s0.parentNode.insertBefore(s1,s0);
              })();
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: COMPANY_NAME,
              description:
                "Kenyan software company building offline-first business tools — Aide POS, inventory and analytics for salons, shops, restaurants and pharmacies.",
              url: SITE_URL,
              logo: `${SITE_URL}/logo.jpg`,
              email: SUPPORT_EMAIL,
              telephone: "+254768213649",
              areaServed: "KE",
              sameAs: [
                "https://github.com/oliver4441/aide",
                "https://omixsystems.store",
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Aide",
              url: SITE_URL,
              description:
                "Offline-first POS, inventory and reporting app for Kenyan businesses.",
              inLanguage: "en-KE",
              publisher: {
                "@type": "Organization",
                name: COMPANY_NAME,
                url: SITE_URL,
              },
            }),
          }}
        />
      </head>
      <body className="font-reading bg-ground text-ink antialiased">
        <Providers>
          {children}
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}
