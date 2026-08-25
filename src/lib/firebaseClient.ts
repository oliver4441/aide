"use client";

export async function signInWithGoogle(): Promise<string> {
  const fb = (window as any).firebase;
  if (!fb?.auth) throw new Error("Firebase not loaded");
  const provider = new fb.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const res = await fb.auth().signInWithPopup(provider);
  return await res.user.getIdToken();
}
