import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

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
