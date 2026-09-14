// Firebase setup for Aide — Google sign-in lives here.
//
// The config below is the web app config from the Firebase Console
// (project omix-systems-cd1af). Values can be overridden per environment with
// the NEXT_PUBLIC_FIREBASE_* variables documented in .env.example.
//
// For Google sign-in to work on a given domain, that domain must be listed in
// Firebase Console → Authentication → Settings → Authorized domains.

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyAs7C-OegYfoPxj8LOYNagZgcMi9yo45Zg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "omix-systems-cd1af.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? "https://omix-systems-cd1af-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "omix-systems-cd1af",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "omix-systems-cd1af.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "458479471215",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:458479471215:web:3f079db61f589afdff5b9a",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-LXQD02D84L",
};

// Server-side rendering evaluates this module too — reuse the app instance.
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth: Auth = getAuth(firebaseApp);

// Analytics is browser-only; load it lazily and never let it break a render.
if (typeof window !== "undefined") {
  import("firebase/analytics")
    .then(({ getAnalytics, isSupported }) =>
      isSupported().then((supported) => {
        if (supported) getAnalytics(firebaseApp);
      }),
    )
    .catch(() => {
      // Analytics unavailable (unsupported browser / blocked script) — ignore.
    });
}
