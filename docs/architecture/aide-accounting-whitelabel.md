# Aide Accounting White-Label & Navigation Integration (`AIDE-BIGCAP-04`)

- **Issue**: #79 (Parent: #75)
- **Branding Config**: `src/lib/accountingBranding.mjs`

---

## 1. Navigation & Reverse-Proxy Plan

- **Single Product Entry**: Users access accounting at `/dashboard/financials` inside Aide's existing dashboard shell (`src/app/dashboard/layout.tsx`).
- **Gateway Proxy**: All accounting API calls route through `/api/internal/accounting/*` on the same origin, eliminating mixed-origin credential leakage and duplicate tenant selectors.
- **Organization Context**: Active `businessId` is resolved server-side from Aide's session/membership (`src/lib/apiAuth.ts`), never from a client-side tenant switcher.

---

## 2. White-Label Patch Set (Upstream Upgrade Checklist)

When rebasing the isolated accounting service:
1. Replace application title, logo, favicon, and email/PDF header templates with Aide's `AIDE_ACCOUNTING_BRANDING` tokens (`#F9F7F1` background, `#111111` ink).
2. Remove standalone login/signup/org-switcher screens (authentication is handled by Aide).
3. Preserve `LICENSE` and expose the AGPL-3.0 attribution notice in Aide's `/terms` or About modal.
4. Run `npm test` (`scripts/tests/accounting-branding.test.mjs`) to verify no competing brand strings remain.
