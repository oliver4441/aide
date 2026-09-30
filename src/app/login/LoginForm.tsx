"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import UiButton from "@/components/ui/UiButton";

type Mode = "signin" | "signup";

export default function LoginForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isSignUp = mode === "signup";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isSignUp && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    if (isSignUp) {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          businessName: businessName || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoading(false);
        setError(data.error || "Could not create your account.");
        return;
      }
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const inputClass =
    "w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Back to home */}
      <Link
        href="/"
        className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      {/* Background blobs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-primary-container opacity-10 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary opacity-5 blur-[120px]" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/logo.jpg" alt="Aide logo" className="w-10 h-10 rounded-xl object-cover shadow-md" />
          <span className="text-2xl font-bold text-primary font-headline">Aide</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/20 text-warning border border-warning/30">BETA</span>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-lg p-8">
          <h1 className="text-2xl font-bold text-on-surface mb-2 text-center font-headline">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-on-surface-variant text-center mb-8 text-sm">
            {isSignUp
              ? "Set up your business space in under a minute"
              : "Sign in to your business dashboard"}
          </p>

          {error && (
            <div className="bg-error-container text-on-error-container px-4 py-3 rounded-lg mb-6 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5" htmlFor="name">
                    Your name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className={inputClass}
                    placeholder="Jane Wanjiru"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5" htmlFor="businessName">
                    Business name <span className="text-on-surface-variant font-normal">(optional)</span>
                  </label>
                  <input
                    id="businessName"
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className={inputClass}
                    placeholder="Wanjiru General Shop"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isSignUp ? 8 : undefined}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                className={inputClass}
                placeholder={isSignUp ? "At least 8 characters" : "••••••••"}
              />
            </div>

            <UiButton
              type="submit"
              disabled={loading}
              loading={loading}
              className="w-full"
            >
              {loading
                ? (isSignUp ? "Creating account..." : "Signing in...")
                : (isSignUp ? "Create Account" : "Sign In")}
            </UiButton>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(isSignUp ? "signin" : "signup");
                setError("");
              }}
              className="text-sm text-primary hover:underline font-medium"
            >
              {isSignUp ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-6">
          Your data stays on this device and syncs when you&apos;re online.
        </p>
      </div>
    </div>
  );
}
