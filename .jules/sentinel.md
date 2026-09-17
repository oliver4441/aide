## 2026-09-17 - Broken Object Level Authorization in Product API Routes
**Vulnerability:** Product API routes (`/api/products` and `/api/products/[id]`) allowed unauthenticated access and cross-tenant data access by falling back to fetching the default business or failing to check `businessId` ownership.
**Learning:** Next.js route handlers were accessing Prisma models directly by record ID without inspecting session business context or enforcing `getServerSession(authOptions)`.
**Prevention:** Always verify `getServerSession(authOptions)` and scope all database queries with `businessId` derived from the session user.
