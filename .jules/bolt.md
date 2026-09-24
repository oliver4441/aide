# Bolt's Journal - Critical Learnings

## 2026-09-21 - Single-Pass Aggregations for Offline IndexedDB Analytics
**Learning:** Chaining `.filter()` and `.reduce()` multiple times over full sales datasets in client-side React components (like `ReportsPage`) forces 15-20 full array iterations and allocates thousands of redundant `Date` objects per render.
**Action:** Single-pass O(N) loop with pre-calculated millisecond timestamp ranges computes all aggregate metrics (total, weekly, monthly, 7-day buckets, product & payment groupings) in 1 pass with zero `Date` object instantiations inside the loop.
