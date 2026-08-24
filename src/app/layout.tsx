import type { Metadata } from "next";
import { Inter, Manrope, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import Providers from "@/components/Providers";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-headline" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Aide",
  description: "Multi-business management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${manrope.variable} ${jetbrains.variable} font-body bg-surface text-on-surface antialiased`}>
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
