import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { OAuth2Client } from "google-auth-library"

// Must match the Firebase project the client initializes with (see
// src/lib/firebase.ts) or Google ID token verification will reject otherwise
// valid sign-ins.
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "omix-systems-cd1af"

// Google accounts that get the admin role on sign-in (comma-separated).
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "kipkiruigideon890@gmail.com")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

const googleClient = new OAuth2Client(FIREBASE_PROJECT_ID)

// Sign-in is Google-only: the client signs in with a Firebase Google popup
// and passes the resulting ID token here for server-side verification.
// Email/password accounts are no longer accepted.
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        idToken: { label: "Google ID token", type: "text" },
      },
      async authorize(credentials) {
        const idToken = (credentials as any)?.idToken
        if (!idToken) {
          throw new Error("Please sign in with Google.")
        }

        try {
          // Verify the Firebase ID token using Google's public keys.
          // This checks the signature, audience, issuer, and expiration.
          const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: FIREBASE_PROJECT_ID,
          })

          const payload = ticket.getPayload()
          if (!payload || !payload.email) {
            throw new Error("Google token claims are invalid")
          }

          const emailVerified = payload.email_verified === true
          if (!emailVerified) {
            throw new Error("Google account email is not verified")
          }

          const email = payload.email

          let u = await prisma.user.findUnique({
            where: { email },
            include: { businesses: { include: { business: true } } },
          })

          if (!u) {
            // passwordHash is a required column; Google-only users get a random
            // unusable hash since passwords are never checked anymore.
            const randomHash = await bcrypt.hash(crypto.randomUUID(), 10)
            u = await prisma.user.create({
              data: {
                email,
                name: payload.name || email.split("@")[0],
                passwordHash: randomHash,
              },
              include: { businesses: { include: { business: true } } },
            })
          }

          return {
            id: u.id,
            email: u.email,
            name: u.name,
            role: (ADMIN_EMAILS.includes(email.toLowerCase())
              ? "admin"
              : "user") as "admin" | "user",
            businessId: u.businesses[0]?.businessId || null,
          }
        } catch (e) {
          console.error("Google authentication error:", e)
          throw new Error("Google sign-in failed. Please try again.")
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.businessId = (user as any).businessId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string
        (session.user as any).role = token.role as string
        (session.user as any).businessId = token.businessId as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
}
