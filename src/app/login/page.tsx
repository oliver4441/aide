import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign In — Aide",
  description:
    "Sign in to your Aide business dashboard. Use your email and password, or continue with Google to manage your business offline.",
  openGraph: {
    title: "Aide — Sign In",
    description: "Sign in to your Aide business dashboard.",
    images: [{ url: "/og-login.jpg", width: 1200, height: 630, alt: "Aide sign in" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aide — Sign In",
    description: "Sign in to your Aide business dashboard.",
    images: ["/og-login.jpg"],
  },
};

export default function LoginPage() {
  return <LoginForm />;
}
