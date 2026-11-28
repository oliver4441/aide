import { randomBytes } from "node:crypto"
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { verifyTurnstile } from "./turnstile"
import admin from "./firebaseAdmin"
import { recordAudit } from "./audit"
import { currentTokenVersion } from "./sessionGuard"

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "kipkiruigideon890@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

/**
 * Session signing secret. Never fall back to a predictable literal: in
 * production a missing secret is a fatal misconfiguration; in development we
 * generate an ephemeral random secret so builds and local runs work without
 * committing a constant (sessions reset when the process restarts).
 */
function resolveAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  // Never a predictable constant. When unset (local dev / CI build without
  // env) use an ephemeral random secret; production auth requests are
  // rejected by assertProductionSecret() until the env var is configured.
  return secret || randomBytes(32).toString("hex");
}

/** Fail closed at request time — builds can still import this module. */
function assertProductionSecret(): void {
  if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_SECRET) {
    throw new Error("NEXTAUTH_SECRET is required in production");
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.FIREBASE_PROJECT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        captchaToken: { label: "Security check", type: "text" },
      },
      async authorize(credentials) {
        assertProductionSecret();
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials")
        }

        const captcha = await verifyTurnstile(
          (credentials as any).captchaToken,
          "login"
        )
        if (!captcha.ok) throw new Error(captcha.error ?? "Security check failed")

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

          await recordAudit({
            action: "auth.login",
            entityType: "Admin",
            entityId: admin.id,
            summary: `Admin ${admin.email} signed in`,
            metadata: { email: admin.email, provider: "credentials" },
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

        await recordAudit({
          action: "auth.login",
          entityType: "User",
          entityId: user.id,
          summary: `User ${user.email} signed in`,
          metadata: { email: user.email, provider: "credentials" },
          actorId: user.id,
          businessId: user.businesses[0]?.businessId ?? null,
        })

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
  secret: resolveAuthSecret(),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user, account }) {
      assertProductionSecret();
      let googleIdentityId: string | null = null;
      if (account && account.provider === "google" && user) {
        // Google OAuth sign-in — auto-create User + Business on first login
        const email = (user.email || "").toLowerCase().trim();

        {
          let existingUser = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              businesses: { select: { businessId: true } },
            },
          });

          if (!existingUser) {
            // Create user + first business (OWNER membership) in a transaction
            // Create organization first (required by AIDE-02)
            existingUser = await prisma.$transaction(async (tx) => {
              const org = await tx.organization.create({
                data: {
                  name: (user.name || "My Business") + " Org",
                  slug: `org-${Date.now()}`,
                },
              });
              const business = await tx.business.create({
                data: {
                  name: (user.name || "My Business"),
                  type: "SHOP",
                  slug: `biz-${Date.now()}`,
                  currency: "KES",
                  taxRate: "16",
                  organizationId: org.id,
                },
              });
              const newUser = await tx.user.create({
                data: {
                  email,
                  name: user.name || "Google User",
                  passwordHash: "", // No password for OAuth-only users
                  businesses: {
                    create: {
                      businessId: business.id,
                      role: "OWNER",
                    },
                  },
                },
                include: {
                  businesses: { select: { businessId: true } },
                },
              });
              return newUser;
            });
          }

          token.id = existingUser.id;
          token.role = "user" as const;
          token.businessId = existingUser.businesses[0]?.businessId ?? null;
          googleIdentityId = existingUser.id;
        }
      }

      if (user && !googleIdentityId) {
        token.id = user.id
        token.role = (user as any).role
        token.businessId = (user as any).businessId
      }

      // AIDE-03: stamp the current account version into the JWT on minting
      // and on every refresh. apiAuth compares it with the database on every
      // request, so bumping the column revokes the session immediately.
      if (token.id) {
        const version = await currentTokenVersion(
          token.role === "admin" ? "admin" : "user",
          String(token.id)
        );
        token.tokenVersion = version ?? 0;
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).businessId = token.businessId
        ;(session.user as any).tokenVersion = token.tokenVersion
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
}