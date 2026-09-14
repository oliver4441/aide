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
- **Auth**: NextAuth.js + Firebase (Google sign-in only — no email/password)
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

See `.env.example` for the full list, including the `NEXT_PUBLIC_FIREBASE_*`
web config used by Google sign-in.

## Google Sign-In Setup (Firebase)

Google sign-in runs through Firebase Authentication. If the login page shows
"Google sign-in isn't available on this domain yet", the domain you are on is
not allowlisted in Firebase. To enable it:

1. Open the [Firebase Console](https://console.firebase.google.com/) and select
   the project (`omix-systems-cd1af` by default).
2. Go to **Authentication → Sign-in method** and make sure the **Google**
   provider is **enabled**.
3. Go to **Authentication → Settings → Authorized domains** and add every
   domain the app is served from, e.g.:
   - `aide.omixsystems.store` (production)
   - any Vercel preview domains you sign in from (`*.vercel.app`)
   - `localhost` is allowed by default
4. If asked, add the same domains to the OAuth client's **Authorized redirect
   URIs** in Google Cloud Console (Firebase links you there automatically).

Changes take effect within a few minutes. To use a different Firebase project
per environment, set the `NEXT_PUBLIC_FIREBASE_*` variables (and matching
`FIREBASE_PROJECT_ID`) — see `.env.example`.

## License

MIT
