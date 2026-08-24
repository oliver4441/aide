import type { Metadata } from "next"
import { Inter, Manrope } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-body" })
const manrope = Manrope({ subsets: ["latin"], variable: "--font-headline" })

export const metadata: Metadata = {
  title: "Aide - Business Management",
  description: "Multi-business management platform for small shops and businesses",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${manrope.variable} font-body`}>
        {children}
      </body>
    </html>
  )
}
