"use client";

import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Circle } from "lucide-react";
import UiButton from "@/components/ui/UiButton";
import TurnstileWidget, { type TurnstileHandle } from "@/components/ui/TurnstileWidget";

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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // AIDE-ENT-04: the MFA challenge is discovered by a public status pre-flight
  // before sign-in, so the password is never sent without a code when one is
  // required.
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaCheckedEmail, setMfaCheckedEmail] = useState("");
  const turnstileRef = useRef<TurnstileHandle | null>(null);
  const router = useRouter();

  const isSignUp = mode === "signup";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isSignUp && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) {
      setError("Please complete the security check.");
      return;
    }

    // Discover whether this account has a second factor. The endpoint is
    // generic for unknown emails and reveals no secret material.
    if (!isSignUp && !mfaRequired && mfaCheckedEmail !== email) {
      try {
        const statusRes = await fetch("/api/auth/mfa/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const status = await statusRes.json().catch(() => ({ mfaRequired: false }));
        setMfaCheckedEmail(email);
        if (status.mfaRequired) {
          setMfaRequired(true);
          setError("Enter the six-digit code from your authenticator app.");
          return;
        }
      } catch {
        // If the pre-flight is unavailable, fall through to normal sign-in;
        // the server still enforces MFA and will reject a code-less attempt.
      }
    }

    setLoading(true);

    if (isSignUp) {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            businessName: businessName || undefined,
            captchaToken,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setLoading(false);
          setError(data.error || "Could not create your account.");
          turnstileRef.current?.reset();
          setCaptchaToken(null);
          return;
        }
      } catch {
        setLoading(false);
        setError("Could not create your account. Please try again.");
        turnstileRef.current?.reset();
        setCaptchaToken(null);
        return;
      }
    }

    let loginToken = captchaToken;
    if (isSignUp && turnstileRef.current) {
      turnstileRef.current.reset();
      loginToken = await turnstileRef.current.nextToken();
      setCaptchaToken(loginToken);
    }

    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !loginToken) {
      setLoading(false);
      setError("Security check expired. Please sign in again.");
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      captchaToken: loginToken ?? "",
      mfaCode: mfaRequired ? mfaCode.replace(/\s/g, "") : "",
      redirect: false,
    });

    setLoading(false);
    turnstileRef.current?.reset();
    setCaptchaToken(null);
    setMfaCode("");

    if (result?.error) {
      setError(mfaRequired ? "Invalid code or password." : "Invalid email or password.");
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
                onChange={(e) => {
                  setEmail(e.target.value);
                  setMfaRequired(false);
                  setMfaCode("");
                  setMfaCheckedEmail("");
                }}
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

            {!isSignUp && mfaRequired && (
              <div>
                <label className="block text-xs font-bold text-secondary mb-1" htmlFor="mfaCode">
                  Authenticator code
                </label>
                <input
                  id="mfaCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={10}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="000000 or backup code"
                />
                <p className="text-xs text-secondary mt-1">
                  Enter a six-digit code from your app, or one of your backup codes.
                </p>
              </div>
            )}

            <TurnstileWidget
              action={isSignUp ? "signup" : "login"}
              onToken={setCaptchaToken}
              handleRef={turnstileRef}
            />

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

            {/* Google OAuth */}
            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-rule" />
              <span className="text-xs text-secondary font-bold">or</span>
              <div className="flex-1 h-px bg-rule" />
            </div>

            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-rule bg-surface text-ink font-bold text-sm hover:bg-ground transition-colors"
              disabled={loading}
            >
              <Circle className="w-4 h-4" />
              Continue with Google
            </button>

          </form>

          <div className="border-t border-rule px-6 py-4 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(isSignUp ? "signin" : "signup");
                setError("");
                setCaptchaToken(null);
                turnstileRef.current?.reset();
              }}
              className="text-sm font-bold text-secondary hover:text-ink hover:underline"
            >
              {isSignUp ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-secondary mt-6">
          Your data stays on this device and syncs when you&apos;re online.
        </p>
      </div>
    </div>
  );
}
