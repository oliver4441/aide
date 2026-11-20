# Bolt's Performance Journal

## 2026-09-16 - Dexie Live Query Derived Computations
**Learning:** `useLiveQuery` triggers component re-renders when reactive IndexedDB tables update, but unmemoized derived calculations (like array filtering and multiple `.reduce()` aggregations) inside custom hooks re-execute on *every single component render*, even when database results remain identical.
**Action:** Always wrap derived metrics calculations and list transformations on `useLiveQuery` outputs in `useMemo` with the query result as dependencies, and combine multiple array traversals into a single O(N) loop.
