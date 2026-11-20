# Newsprint Redesign

## Goal
Apply the Newsprint design system to the existing Aide codebase as a full replacement. No new features — only visual/design changes. CRM and SACCO are out of scope for this phase.

## What Must Change
1. **Fonts**: Source Serif 4 ("Newsprint Display") for masthead/headlines/labels/controls, EB Garamond ("Newsprint Reading") for body/quotations. Currently Inter/Mansole.
2. **Color tokens**: Replace the plum/ocean/forest/sunset palette with the Newsprint CSS variables (warm off-white ground `#f3efe5`, near-black ink `#191916`, secondary text, rule, red accent `[a3231d]`). Remove all Tailwind semantic tokens (`bg-surface`, `text-on-surface`, `bg-primary`, etc.).
3. **Components**: Rounded cards + glass panels → ruled newspaper layouts with square (0-radius) controls. Native `<details>` disclosures as question rows.
4. **Motion**: `dp-motion-transition: none` — remove all existing animations (fadeIn, ui-spin sheen, framer-motion). Hover/selection/invert must be immediate.
5. **Responsive**: Breakpoints at 1100px and 700px (vs Tailwind defaults 768/1024).
6. **ThemeProvider**: Delete — Newsprint has no color-theme variants. Delete ThemeToggle. Remove accent-palette logic.
7. **Layout**: Ruled columns with thin vertical dividers + heavier (4px) horizontal section rules. Masthead → broad 3:1 headline/action split → supporting content.

## File Inventory (37 files with >0 matches)

**Highest-traffic components** (most token/animation usage):
- `src/app/dashboard/reports/ReportsPageInner.tsx` (62 hits)
- `src/app/dashboard/inventory/InventoryPageInner.tsx` (61)
- `src/app/dashboard/settings/SettingsPageInner.tsx` (59)
- `src/app/dashboard/DashboardPageInner.tsx` (41)
- `src/app/downloads/DownloadsClient.tsx` (38)
- `src/app/dashboard/pos/POSPageInner.tsx` (38)
- `src/components/reports/SalesLog.tsx` (34)

**Landing pages**:
- `src/components/landing/Hero.tsx` (32)
- `src/components/landing/LandingNav.tsx`, `LandingFooter.tsx`, `Features.tsx`, `Pricing.tsx`, `FaqSection.tsx`, `DownloadSection.tsx`

**UI primitives & infra**:
- `src/components/ui/UiButton.tsx` (8)
- `src/components/ui/Container.tsx`
- `src/components/ThemeProvider.tsx`, `src/components/ThemeToggle.tsx`
- `src/components/Sidebar.tsx`
- `src/components/BusinessGate.tsx`, `src/components/OfflineStatus.tsx`
- `src/components/OnlineStatus.tsx`, `src/components/pwa/*`

**Dashboard sections**:
- `src/app/dashboard/admin/reviews/AdminReviewsPageInner.tsx` (26)
- `src/app/dashboard/admin/AdminPageInner.tsx` (24)
- `src/app/dashboard/notifications/page.tsx` (20)

**Receipts, reviews, help, docs**:
- `src/components/receipt/ReceiptDocument.tsx` (21)
- `src/components/reviews/*`, `src/components/help/*`
- `src/components/receipt/PrintReceipt.tsx`, `src/components/reports/*`

**Public pages**:
- `src/app/help/page.tsx`, `src/app/login/LoginForm.tsx`, `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`
- `src/app/docs/*`, `src/components/docs/*`

## Execution Order
1. **Foundation**: globals.css rewrite (Newsprint tokens, remove animations), tailwind.config.ts rewrite (fonts, breakpoints, remove semantic colors), delete ThemeProvider + ThemeToggle
2. **UI primitives**: UiButton, Container, Sidebar, UiLoader/UiSpinner — Newsprint variants
3. **Dashboard core**: DashboardPageInner, InventoryPageInner, POSPageInner, ReportsPageInner, SettingsPageInner
4. **Landing/public**: Hero, LandingNav, LandingFooter, Features, Pricing, FaqSection, DownloadSection
5. **Supporting**: ReceiptDocument, SalesLog, all admin/review/help/docs/notifications pages
6. **Cleanup sweep**: grep for any remaining plum/surface/rounded/shadow tokens, fix

## Out of Scope
- Authentication, sync engine, Prisma schema, API routes
- Feature additions
- CRM or SACCO modules

## Definition of Done
- `npm run dev` shows the existing Aide UI but with Newsprint styling across all pages and components
- No plum/ocean/forest/sunset color references remain
- No rounded corners (`border-radius: 0`) on controls
- No remaining Tailwind semantic tokens (`bg-surface`, `bg-primary`, `text-on-surface-variant`, etc.)
- No remaining CSS animations or framer-motion usage
- Fonts load from Google Fonts (Source Serif 4, EB Garamond)
- 1100px and 700px breakpoints active