# Agent E — PWA Logo/Favicon/Meta + Beta Badge + Global Cleanup

## Changes Made

### 1. PWA Logo/Favicon
- **`public/manifest.webmanifest`** — Updated icons from `icon-192.png`/`icon-512.png` to `logo.jpg` (image/jpeg)
- **`public/sw.js`** — Updated `STATIC_ASSETS` to cache `/logo.jpg` instead of old icon PNGs
- **`src/app/layout.tsx`** — Changed `apple-touch-icon` href to `/logo.jpg`, added `<link rel="icon" type="image/jpeg" href="/logo.jpg" />`

### 2. PWA Meta Tags (layout.tsx)
Added to `<head>`:
- `<meta name="application-name" content="Aide" />`
- `<meta name="apple-mobile-web-app-capable" content="yes" />`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`
- `<meta name="apple-mobile-web-app-title" content="Aide" />`
- `<meta name="theme-color" content="#6f264f" />`
- `<meta name="msapplication-TileColor" content="#6f264f" />`
- `<meta name="msapplication-tap-highlight" content="no" />`
- `<link rel="manifest" href="/manifest.webmanifest" />`

### 3. Beta Badge
- **`src/app/login/page.tsx`** — Added `<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/20 text-warning border border-warning/30">BETA</span>` next to the Aide logo text
- **`src/app/dashboard/layout.tsx`** — Added a top-right header bar with the BETA badge (hidden on mobile, visible on md+)

### 4. Global Emoji Removal
Replaced emojis with SVG icons or removed them:
- **`src/components/ads/AdSidebar.tsx`** — Replaced 🚀 with a lightning bolt SVG icon
- **`src/components/help/HelpCenter.tsx`** — Replaced 👍 with thumbs-up SVG, 👎 with thumbs-down SVG

### 5. Files Verified (No Emojis Found)
- `src/components/OnlineStatus.tsx` — clean
- `src/components/ads/AdBanner.tsx` — clean
- `src/components/help/HelpWidget.tsx` — clean
- `src/components/help/FAQSection.tsx` — clean
- `src/components/help/ContactSection.tsx` — clean
- `src/components/onboarding/*.tsx` — all 6 files clean
- `src/components/reviews/ReviewPrompt.tsx` — clean (★ is a text character, not emoji)
- `src/components/reviews/ReviewModal.tsx` — clean
- `src/app/help/page.tsx` — clean
