"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import UiButton from "@/components/ui/UiButton";

type Mode = "signin" | "signup";

const inputClass =
  "w-full px-4 py-3 border-b border-rule bg-transparent text-ink font-reading text-base focus:outline-none focus:border-ink";

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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">

      {/* Back to home */}
      <Link
        href="/"
        className="absolute top-4 left-4 inline-flex items-center gap-1.5 border-b border-transparent px-3 py-2 text-sm font-medium text-secondary hover:border-rule hover:text-ink"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <div className="w-full max-w-md">
        {/* Masthead */}
        <div className="text-center mb-8">
          <span className="font-display text-3xl font-black tracking-tight text-ink">Aide</span>
        </div>

        {/* Form block — ruled */}
        <div className="border border-rule">
          <h1 className="font-display text-xl font-black text-ink p-6 pb-2 text-center">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-secondary text-center text-sm px-6 pb-6">
            {isSignUp
              ? "Set up your business space in under a minute"
              : "Sign in to your business dashboard"}
          </p>

          {error && (
            <div className="mx-6 mb-6 border-b border-danger/60 pb-2 text-danger text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-xs font-bold text-secondary mb-1" htmlFor="name">
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
                  <label className="block text-xs font-bold text-secondary mb-1" htmlFor="businessName">
                    Business name <span className="font-normal">(optional)</span>
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
              <label className="block text-xs font-bold text-secondary mb-1" htmlFor="email">
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
              <label className="block text-xs font-bold text-secondary mb-1" htmlFor="password">
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

          <div className="border-t border-rule px-6 py-4 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(isSignUp ? "signin" : "signup");
                setError("");
              }}
              className="text-sm font-bold text-secondary hover:text-ink hover:underline"
            >
              {isSignUp ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-secondary mt-6">
          Your data stays on this device and syncs when you're online.
        </p>
      </div>
    </div>
  );
}
