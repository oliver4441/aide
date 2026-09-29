import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "kipkiruigideon890@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials")
        }

        const email = credentials.email.toLowerCase().trim()
        const isAdmin = ADMIN_EMAILS.includes(email)

        // Platform admins sign in against the Admin table; everyone else
        // against the User table. Each role gets exactly one password check.
        if (isAdmin) {
          const admin = await prisma.admin.findUnique({
            where: { email },
            select: { id: true, email: true, name: true, passwordHash: true },
          })

          if (!admin?.passwordHash) return null

          const isValid = await bcrypt.compare(credentials.password, admin.passwordHash)
          if (!isValid) throw new Error("Invalid credentials")

          const firstBusiness = await prisma.business.findFirst({
            where: { adminId: admin.id },
            select: { id: true },
          })

          return {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: "admin" as const,
            businessId: firstBusiness?.id ?? null,
          }
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            businesses: { select: { businessId: true } },
          },
        })

        if (!user?.passwordHash) {
          // Spend a comparison so a missing account and a wrong password take
          // comparable time, avoiding an account-enumeration oracle.
          await bcrypt.compare(
            credentials.password,
            "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
          )
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!isValid) throw new Error("Invalid credentials")

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: "user" as const,
          businessId: user.businesses[0]?.businessId ?? null,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
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
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).businessId = token.businessId
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
}
