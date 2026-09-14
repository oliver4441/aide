"use client";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { firebaseAuth } from "./firebase";

/**
 * Opens the Google sign-in popup and returns a Firebase ID token that the
 * server verifies in the NextAuth credentials provider.
 */
export async function signInWithGoogle(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Google sign-in is only available in the browser");
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const res = await signInWithPopup(firebaseAuth, provider);
    if (!res?.user) throw new Error("Google did not return a user");
    return await res.user.getIdToken(true);
  } catch (error: any) {
    // Keep the Firebase error code available to the UI so configuration and
    // browser-specific failures are actionable instead of becoming a generic
    // "Google sign-in failed" message.
    const code = error?.code ? ` (${error.code})` : "";
    const message = error?.message || "Google sign-in failed";
    throw new Error(`${message}${code}`);
  }
}
