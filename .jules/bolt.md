# Bolt's Journal - Critical Learnings

## 2026-09-21 - Single-Pass Aggregations for Offline Analytics
**Learning:** Chaining `.filter()` and `.reduce()` multiple times over full sales datasets in client-side React components (like `ReportsPage`) forces 15-20 full array iterations and allocates thousands of redundant `Date` objects per render.
**Action:** Single-pass O(N) loop with pre-calculated millisecond timestamp ranges computes all aggregate metrics (total, weekly, monthly, 7-day buckets, product & payment groupings) in 1 pass with zero `Date` object instantiations inside the loop.

## 2026-09-27 - Batching IndexedDB Writes for Offline-First Sync
**Learning:** Awaiting individual `db.table.put()` or `db.table.delete()` calls in loops during offline sync (`push()` and `pull()`) or sales recording creates a separate IndexedDB transaction per item. For hundreds of products/sales, this causes high transaction overhead and main thread blocking.
**Action:** Use Dexie `bulkPut()`, `bulkDelete()`, and wrap multi-table writes in a single `db.transaction('rw', [...])` block to reduce hundreds of sequential transactions to a single batch write per table.
