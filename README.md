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
- **Auth**: NextAuth.js
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

## License

MIT
