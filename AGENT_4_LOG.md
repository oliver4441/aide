# Agent 4 (E) - Dashboard + Receipts Log

## Files Created/Modified
- `src/lib/format.ts` (NEW) — formatMoney, formatDate, timeAgo utilities
- `src/components/OnlineStatus.tsx` (NEW) — online/offline indicator component
- `src/components/Sidebar.tsx` (EDIT) — semantic tokens, ThemeToggle + OnlineStatus integration, business name from hook
- `src/app/dashboard/layout.tsx` (EDIT) — semantic bg-surface token
- `src/app/dashboard/page.tsx` (EDIT) — offline hooks, semantic tokens, formatMoney
- `src/app/dashboard/pos/page.tsx` (EDIT) — offline hooks, receipt integration, semantic tokens
- `src/app/dashboard/inventory/page.tsx` (EDIT) — offline hooks, ProductRecord-based CRUD, semantic tokens
- `src/app/dashboard/sales/page.tsx` (EDIT) — offline hooks, client-side pagination, Print column, semantic tokens
- `src/app/dashboard/reports/page.tsx` (EDIT) — offline hooks, computed report data, semantic tokens
- `src/app/dashboard/settings/page.tsx` (EDIT) — business settings hook, sync conflicts from Dexie, export data, semantic tokens
- `src/components/receipt/ReceiptDocument.tsx` (NEW) — supermarket-grade thermal receipt with @media print
- `src/components/receipt/PrintReceipt.tsx` (NEW) — printReceipt() function + PrintButton component

## Receipt Spec
- Thermal 80mm layout on screen, @media print for clean output
- Business header (name, address placeholder), receipt #, date/time, cashier
- Items table: name, qty × unit price = line total
- Subtotal, VAT line computed as `total - total/(1+rate/100)`, total
- Amount paid, change (cash), payment method
- Footer from business.receiptFooter
- Monospace font (JetBrains Mono via Google Fonts CDN in print window)
- Opens new window for printing, auto-triggers window.print()

## Theme Migration
All hardcoded dark-* classes replaced with semantic tokens:
- bg-dark-bg/bg-dark-surface → bg-surface / bg-surface-container-low
- border-dark-border → border-outline-variant
- text-white → text-on-surface
- text-zinc-* → text-on-surface-variant / text-on-surface
- text-red-400 → text-danger
- text-emerald-400 → text-success
- text-amber-400 → text-warning
- bg-red-500/10 → bg-danger/10
- bg-emerald-500/15 → bg-success/15
- bg-zinc-* → bg-surface-container variants
- font-[family-name:var(--font-headline)] → font-headline
- text-white (buttons) → text-on-primary

## Errors Encountered
- Hook API mismatch: Agent 3's hooks return flat data (e.g. `useDashboard()` returns `{ todayRevenue, todayProfit, ... }` not `{ data: { todaySales } }`). Adapted all pages to match actual APIs.
- `_count` property missing on CategoryRecord from Dexie — removed category product count display.
- useSales returns flat array (no pagination params) — implemented client-side pagination.

## Status: COMPLETE
