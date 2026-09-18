## 2026-09-16 - API Route Tenant Isolation & Session Auth in Offline-First Next.js Apps
**Vulnerability:** Mutation endpoints (`PATCH` and `DELETE` on `/api/products/[id]`) were unauthenticated and lacked tenant authorization checks, allowing anonymous users to modify or delete products across any business.
**Learning:** In offline-first apps with Dexie/IndexedDB sync engines, standalone REST API endpoints may accidentally be left exposed without NextAuth `getServerSession` or business ID matching.
**Prevention:** Always verify active `session.user` and enforce `businessId` checks on all API mutation handlers before modifying backend Prisma database models.
