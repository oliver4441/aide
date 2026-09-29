# Aide

Multi-business management platform for small shops and businesses.

## Features

- **Multi-Business Support** - Manage multiple businesses from one account
- **Inventory Management** - Track stock, pricing, and categories
- **Point of Sale** - Complete checkout with multiple payment methods
- **Sales History** - Transaction logs and receipts
- **Business Reports** - Revenue, profit, and analytics
- **Admin Dashboard** - Platform administration
- **Offline-First** - Works without internet
- **PWA** - Installable on any device

## Tech Stack

- **Frontend**: Next.js 14+ (App Router)
- **Database**: Neon (PostgreSQL)
- **Auth**: NextAuth.js credentials (email + password)
- **Hosting**: Vercel
- **Styling**: Tailwind CSS

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Run development server
npm run dev
```

## Environment Variables

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
```

See `.env.example` for the full list.

## Authentication

Sign-in is **email and password**, handled by NextAuth's credentials provider
(`src/lib/auth.ts`). Passwords are bcrypt-hashed and never stored in the clear.

- **Web**: `POST /api/auth/register` creates the account, a default business,
  and the owner's membership in one transaction. The login page then signs in
  through NextAuth and receives a session cookie.
- **Native clients**: any client that cannot run the browser flow can use
  `POST /api/auth/mobile-login` with a JSON body. It returns a bearer token
  (HS256, 30-day expiry) to send as `Authorization: Bearer <token>`. The
  shipped Android APK does not use this — it is local-only and has no account.

## Two clients, two models

| | PWA (web) | Android APK |
|---|---|---|
| Storage | IndexedDB (Dexie) | Room (on-device) |
| Cloud sync | Yes, via `/api/sync` | **No** |
| Account | Email + password | None |
| Works offline | Yes | Yes |

The Android app is deliberately local-only. Uninstalling it deletes all its
data, so export anything you need to keep.

Emails listed in `ADMIN_EMAILS` are matched against the `Admin` table and get
the `admin` role; everyone else authenticates against the `User` table.

### Tenant isolation

Every data route authorizes through `src/lib/apiAuth.ts`. A caller's
`businessId` is only honoured when a `BusinessMembership` row proves they
belong to it; otherwise it falls back to their own first business. There is no
"first business in the database" fallback and no role-based bypass, so one
tenant can never read or mutate another's records.

## License

MIT
