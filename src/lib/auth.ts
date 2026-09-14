import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

// Must match the Firebase project the client initializes with (see
// NEXT_PUBLIC_FIREBASE_* in src/app/layout.tsx) or Google ID token
// verification will reject otherwise valid sign-ins.
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "omix-systems-cd1af"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        idToken: { label: "Google ID token", type: "text" },
      },
      async authorize(credentials) {
        // Google sign-in: verify the Firebase ID token server-side.
        const idToken = (credentials as any)?.idToken
        if (idToken) {
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
        }

        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials")
        }

        // Check User table first
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { businesses: { include: { business: true } } },
        })

        if (user?.passwordHash) {
          const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
          if (!isValid) throw new Error("Invalid credentials")

          const businessId = user.businesses[0]?.businessId || null
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: "user" as const,
            businessId,
          }
        }

        // Check Admin table
        const admin = await prisma.admin.findUnique({
          where: { email: credentials.email },
        })

        if (admin?.passwordHash) {
          const isValid = await bcrypt.compare(credentials.password, admin.passwordHash)
          if (!isValid) throw new Error("Invalid credentials")

          // Admin gets access to first business they created
          const firstBusiness = await prisma.business.findFirst({
            where: { adminId: admin.id },
          })

          return {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: "admin" as const,
            businessId: firstBusiness?.id || null,
          }
        }

        throw new Error("Invalid credentials")
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
