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
---

## Post-merge fix log (2026-10-30)

The first pass applied the redesign by *replacing* Tailwind's theme instead of
extending it, and only migrated part of the app. Symptom: text looked "off"
and misaligned everywhere — headlines rendered at body size, the desktop nav
never appeared, grids stayed single-column, receipts fell back to serif.

### Root causes fixed

1. **Theme was destructive** (`tailwind.config.ts`) — `theme.fontSize`,
   `theme.borderRadius`, `theme.screens`, `theme.colors`, `theme.fontFamily`,
   `theme.boxShadow` and `theme.transitionProperty` replaced the defaults, which
   deleted ~700 utility usages app-wide. On the landing page alone 45 of 227
   classes produced no CSS. Everything Newsprint-specific now lives under
   `theme.extend`, so `text-sm`, `md:*`, `rounded-lg`, `font-mono` and
   `border-transparent` exist again.
2. **Fonts pointed at families that are never loaded** — the tokens said
   `"Newsprint Display"` / `"Newsprint Reading"` (design names) instead of the
   loaded Source Serif 4 / EB Garamond, so the whole app rendered in Georgia
   with synthesized weights. EB Garamond is also now requested weight-by-weight
   (a `400..800` range can fail for a non-variable family and silently drop it).
3. **Opacity modifiers produced no CSS** — colours declared as bare `var(--x)`
   cannot take `/10` in Tailwind v3, so `bg-accent/10`, `bg-ink/50` and
   `border-rule/60` were empty rules. Colours are now
   `rgb(var(--dp-color-x-rgb) / <alpha-value>)`.
4. **Half-migrated screens** — settings, help, docs, downloads, privacy, terms,
   notifications, calculator, error/404 and the shared receipt still used
   `bg-surface`, `text-on-surface`, `bg-primary`, `border-outline-variant`,
   `font-headline`, `rounded-*` and `shadow-*`, none of which existed. All were
   migrated to Newsprint tokens.
5. **Photo wallpaper behind the dashboard** — `DashboardWallpaper` painted a
   photo + cool scrim onto `<body>`, so ruled cream cards sat on a photograph.
   Removed along with the never-mounted theme/accent/background pickers
   (`ThemeProvider`, `ThemeToggle`, `BackgroundLayer` and the Settings →
   Appearance card, which was a no-op UI).

### Typography / alignment changes

- Body reading size 19px with 1.55 leading (was 20px/1.3 — cramped for Garamond).
- Headings no longer carry a blanket 22px bottom margin; spacing comes from
  utilities so title/subtitle gaps match the rest of the layout.
- One page-title scale (`font-display text-2xl md:text-3xl font-black`) across
  dashboard routes; legal/docs body copy lifted to 17px.
- `text-wrap: balance` on headings, `pretty` on paragraphs (no orphan words in
  two-line headlines).
- Tabular figures on `.font-display`, so money columns line up.
- Landing sections share one container measure (`Container wide`), matching the
  nav and footer; the hero photo is a cream scrim instead of an opaque plate.
- Sticky headers are fully opaque (they had lost `backdrop-blur`), and the fixed
  landing nav has a ground background so content cannot scroll through it.
- `UiLoader` uses a plain CSS ring instead of framer-motion.

### Verification

`tailwindcss` output is checked against every class rendered by `/`, `/help`,
`/docs`, `/downloads`, `/privacy`, `/terms`, `/login` and the 404 page: no class
resolves to a missing utility (only icon-component class names remain).

### Dark mode (reinstated 2026-10-30)

The original brief said "no dark mode", but the product needs one, so it is back
as a real theme rather than a dead picker:

- `.dark` on `<html>` re-points every Newsprint token: warm near-black ground
  `#14130f`, cream ink `#f2ede2`, secondary `#b3ada0`, rule `#6b675d`, and an
  accent lifted to `#e4655a` so red text still clears 4.5:1 (5.6:1 measured).
  Functional colours (error/success/warning/danger) are lifted too.
- The hero photo gets its own dark tokens — `--dp-photo-opacity: 0.7`,
  `--dp-photo-wash-top: 0.7` — because a bright daylight image under a dark
  ground otherwise drowns the display type. Worst-case ink contrast: 9.3:1.
- No provider: a blocking script in `src/app/layout.tsx` applies the stored or
  system choice before paint (no cream flash), and `ThemeToggle` flips the
  class + `localStorage`. Server and client markup stay identical — both icons
  are always rendered and `dark:hidden` / `dark:block` pick the visible one.
- Toggle lives in the landing nav (desktop + mobile sheet), the dashboard
  top-right cluster beside the notification bell, and the docs and help
  headers.
