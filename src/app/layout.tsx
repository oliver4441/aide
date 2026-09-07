import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import Providers from "@/components/Providers";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
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
    "msapplication-TileColor": "#6f264f",
    "msapplication-tap-highlight": "no",
    "theme-color": "#6f264f",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6f264f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/jpeg" href="/logo.jpg" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Manrope:wght@200..800&family=JetBrains+Mono:wght@100..800&display=swap" rel="stylesheet" />
        <meta name="application-name" content="Aide" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Aide" />
        <meta name="theme-color" content="#6f264f" />
        <meta name="msapplication-TileColor" content="#6f264f" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
        <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{firebase.initializeApp({apiKey:"AIzaSyAs7C-OegYfoPxj8LOYNagZgcMi9yo45Zg",authDomain:"omix-systems-cd1af.firebaseapp.com",projectId:"omix-systems-cd1af",storageBucket:"omix-systems-cd1af.firebasestorage.app",messagingSenderId:"458479471215",appId:"1:458479471215:web:3f079db61f589afdff5b9a"})}catch(e){}`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`,
          }}
        />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              var Tawk_API=Tawk_API||{};
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
              name: "OmixSystems",
              description:
                "Kenyan software company building offline-first business tools — Aide POS, inventory and analytics for salons, shops, restaurants and pharmacies.",
              url: "https://aide.omixsystems.store",
              logo: "/logo.jpg",
              sameAs: [
                "https://github.com/oliver4441/aide",
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: "OmixSystems — Aide",
              description:
                "Offline-first POS, inventory and reporting software for Kenyan businesses.",
              url: "https://aide.omixsystems.store",
              logo: "/logo.jpg",
              address: {
                "@type": "PostalAddress",
                addressCountry: "KE",
                addressLocality: "Nairobi",
              },
              areaServed: "KE",
              provider: {
                "@type": "Organization",
                name: "OmixSystems",
                url: "https://aide.omixsystems.store",
              },
            }),
          }}
        />
      </head>
      <body className="font-body bg-surface text-on-surface antialiased">
        <Providers>
          <ThemeProvider>
            {children}
            <ServiceWorkerRegister />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
