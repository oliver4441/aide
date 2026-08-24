# Agent 3 (D) - Offline-First Core + PWA + Sync Log

## Files Created/Modified
- `src/lib/db.ts` (NEW) - Dexie schema with typed tables for products, categories, sales, saleItems, businesses, syncQueue, syncConflicts
- `src/lib/sync.ts` (NEW) - SyncEngine singleton with push/pull/enqueue, online/offline listeners, auto-sync
- `src/lib/conflicts.ts` (NEW) - Deterministic conflict resolver (LWW by updatedAt + deviceId tiebreak) and stock oversell checker
- `src/hooks/useProducts.ts` (NEW) - useLiveQuery-based hook with mutate/remove + sync enqueue
- `src/hooks/useSales.ts` (NEW) - useLiveQuery-based hook with mutate for sales + sale items
- `src/hooks/useCategories.ts` (NEW) - useLiveQuery-based hook with mutate/remove + sync enqueue
- `src/hooks/useDashboard.ts` (NEW) - Aggregates today's sales count/revenue/profit/cost, low stock, total products
- `src/hooks/useBusinessSettings.ts` (NEW) - Reads active business from Dexie, supports mutate
- `src/app/api/sync/route.ts` (NEW) - POST accepts mutations array, upserts to Neon via Prisma, checks conflicts; GET returns changes since timestamp
- `src/components/ServiceWorkerRegister.tsx` (NEW) - Registers /sw.js, listens for controllerchange
- `src/components/OnlineStatus.tsx` (NEW) - Compact pill: Online (green), Offline (amber), Syncing (blue pulse)
- `public/manifest.webmanifest` (NEW) - PWA manifest with name, icons, theme
- `public/sw.js` (NEW) - Service worker: cache-first static, network-first navigation, API response caching
- `public/icon-192.png` (NEW) - Placeholder PNG
- `public/icon-512.png` (NEW) - Placeholder PNG
- `prisma/schema.prisma` (EDIT) - Added tax/taxRate/cashier to Sale, added SyncConflict model
- `package.json` (EDIT) - Added dexie@^4.0.0, dexie-react-hooks@^1.1.0

## Hooks Provided (Contract)
- `useProducts(businessId?: string)` → `{ data: ProductRecord[], loading, error, mutate, remove }`
- `useSales(businessId?: string)` → `{ data: SaleRecord[], loading, error, mutate }`
- `useCategories(businessId?: string)` → `{ data: CategoryRecord[], loading, error, mutate, remove }`
- `useDashboard(businessId?: string)` → `{ todaySalesCount, todayRevenue, todayProfit, todayCost, lowStockProducts, totalProducts, recentSales, loading }`
- `useBusinessSettings()` → `{ data: BusinessRecord | null, loading, mutate }`

## Sync Protocol
1. Client writes to Dexie locally, enqueues mutation in syncQueue with timestamp + deviceId
2. On online event or auto-sync interval (30s), push() sends queued mutations to POST /api/sync
3. Server upserts each mutation to Neon/Postgres via Prisma (idempotent by id)
4. If conflict detected (different updatedAt), server calls resolveConflict()
5. If manual review needed, creates SyncConflict record; returns conflicts in response
6. Client marks synced records, stores conflicts in Dexie syncConflicts table
7. pull() fetches server changes since last sync timestamp, upserts into Dexie

## Conflict Algorithm
- **Products**: Last-Write-Wins by `updatedAt` timestamp. Tie-break by `deviceId` string comparison.
- **Sales**: Append-only, never conflict (client-wins always).
- **Stock oversell check**: Sorts movements by timestamp, simulates quantity changes, fails if any step goes negative.

## Errors Encountered
- dexie-react-hooks exports `useLiveQuery`, not `liveQuery` (which is from dexie core). All hooks rewritten to use `useLiveQuery`.
- Duplicate `sale:` property in Prisma where clause for saleItems GET endpoint. Merged into single compound condition.
- Pre-existing type errors in dashboard files (not my files) remain unresolved.

## Status: COMPLETE
