// Firebase Admin SDK initialization (server-side only)
// Using require to avoid firebase-admin v12+ ESM/CJS module resolution issues
const { initializeApp, cert, apps } = require("firebase-admin");

if (!apps.length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    databaseURL: "https://omix-systems-cd1af-default-rtdb.firebaseio.com",
  });
}

const admin = require("firebase-admin");
export default admin;
