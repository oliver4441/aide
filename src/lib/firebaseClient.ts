"use client";

const FIREBASE_LOAD_TIMEOUT_MS = 10_000;

function getFirebase(): any {
  if (typeof window === "undefined") {
    throw new Error("Google sign-in is only available in the browser");
  }

  const fb = (window as any).firebase;
  if (!fb?.auth || !fb?.auth?.GoogleAuthProvider) {
    throw new Error("Google sign-in is not ready. Please refresh and try again.");
  }

  return fb;
}

async function waitForFirebase(): Promise<any> {
  try {
    return getFirebase();
  } catch {
    // The Firebase CDN scripts are loaded in the root layout. Give them a short
    // window to finish loading before failing, which avoids a race on slower
    // mobile connections.
    await new Promise<void>((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        try {
          getFirebase();
          resolve();
          return;
        } catch {
          if (Date.now() - started >= FIREBASE_LOAD_TIMEOUT_MS) {
            reject(new Error("Google sign-in could not initialize. Please refresh the page."));
            return;
          }
          window.setTimeout(check, 100);
        }
      };
      check();
    });
    return getFirebase();
  }
}

export async function signInWithGoogle(): Promise<string> {
  const fb = await waitForFirebase();
  const provider = new fb.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const res = await fb.auth().signInWithPopup(provider);
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
