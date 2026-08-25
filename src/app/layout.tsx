import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import Providers from "@/components/Providers";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aide - Business Management",
  description: "Offline-first POS, inventory & analytics for modern businesses",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aide",
  },
  other: {
    "mobile-web-app-capable": "yes",
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
