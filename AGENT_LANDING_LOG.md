# Agent A — Landing Page Complete Overhaul Log

## Files Modified
- `src/app/page.tsx` — Added FaqSection import and placement between Features and Pricing
- `src/components/landing/Hero.tsx` — Replaced tagline, removed fake social proof, kept headline
- `src/components/landing/LandingNav.tsx` — Added BETA badge, updated all nav links with correct URLs
- `src/components/landing/Pricing.tsx` — Changed USD to KES, added Coming Soon badges/lock icons
- `src/components/landing/LandingFooter.tsx` — Updated all links, copyright, BETA attribution
- `src/components/landing/SocialProof.tsx` — Removed false claim, kept business type pills
- `src/components/landing/FaqSection.tsx` — NEW: 8-question accordion FAQ section

## Files NOT Touched
- src/app/dashboard/**, src/app/login/**, src/lib/**, src/hooks/**, src/components/Sidebar.tsx, src/components/ThemeProvider.tsx, src/app/layout.tsx, prisma/**, public/**, package.json

## Changes Summary
1. Hero: Tagline changed to "Offline-first business management that actually works", removed "500+ businesses" claim
2. SocialProof: Changed "Works for every type of business" to "Built for all business types", no numbers
3. Pricing: All prices converted to KES, Free=KSh0, Pro=KSh1,490, Enterprise=KSh4,990, Pro+Enterprise show "Coming Soon" with lock icon
4. Footer: All links point to omixsystems.store/blog.omixsystems.store, copyright to OmixSystems 2026
5. Nav: Added BETA badge, About/API Docs/Blog open in new tabs to OmixSystems domains
6. FaqSection: New component with 8 FAQs in expandable accordion using design tokens

## Design Tokens Used
- bg-surface, text-on-surface, bg-primary, text-on-primary, border-outline-variant
- bg-surface-container, bg-surface-container-low, text-on-surface-variant
- bg-primary/10, bg-primary/20, bg-warning/20, bg-success, bg-danger
- text-primary, text-warning, text-success, text-danger
