# Bolt's Journal - Critical Performance Learnings

## 2025-09-17 - Prevent unnecessary product array re-filtering in interactive POS views
**Learning:** In interactive offline-first POS workflows with frequent state mutations (cart item adjustments, payment selection, modal typing), un-memoized client-side filtering on large product catalog arrays causes avoidable CPU re-evaluations on every keystroke or click.
**Action:** Always wrap client-side product/item search filters in `useMemo` with explicit dependencies (`[allProducts, search]`) when parent components manage high-frequency interactive state.
