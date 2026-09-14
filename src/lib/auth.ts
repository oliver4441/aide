import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

// Must match the Firebase project the client initializes with (see
// src/lib/firebase.ts) or Google ID token verification will reject otherwise
// valid sign-ins.
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "omix-systems-cd1af"

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
          const res = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
            { cache: "no-store" },
          )
          if (!res.ok) throw new Error("Google token verification failed")

          const info = await res.json()
          const emailVerified = info.email_verified === true || info.email_verified === "true"
          const issuer = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`

          if (
            info.aud !== FIREBASE_PROJECT_ID ||
            !emailVerified ||
            info.iss !== issuer ||
            !info.email
          ) {
            throw new Error("Google token claims are invalid")
          }

          let u = await prisma.user.findUnique({
            where: { email: info.email },
            include: { businesses: { include: { business: true } } },
          })

          if (!u) {
            // passwordHash is a required column; Google-only users get a random
            // unusable hash since passwords are never checked anymore.
            const randomHash = await bcrypt.hash(crypto.randomUUID(), 10)
            u = await prisma.user.create({
              data: {
                email: info.email,
                name: info.name || info.email.split("@")[0],
                passwordHash: randomHash,
              },
              include: { businesses: { include: { business: true } } },
            })
          }

          return {
            id: u.id,
            email: u.email,
            name: u.name,
            role: "user" as const,
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
