import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * `src/app/login/page.tsx` is a client component and cannot export metadata, so
 * the sign-in metadata lives here.
 *
 * The sign-in page is an auth screen: it has no content worth ranking, and
 * indexing it only creates a thin page that competes with the homepage. It is
 * therefore `noindex` (crawlable, but not listed) and is excluded from the
 * sitemap for the same reason.
 */
export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to your Aide business account to manage sales, inventory, receipts and reports. Email and password sign-in.",
  robots: { index: false, follow: true },
  alternates: {
    canonical: `${SITE_URL}/login`,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
