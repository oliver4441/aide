# Bigcapital Fork Audit (`AIDE-BIGCAP-01`)

- **Issue**: #76 (Parent: #75)
- **Upstream Repository**: `bigcapitalhq/bigcapital`
- **Pinned Baseline Commit**: `607f10a43d7ae9418c6ae50a4e38d262f161a9c4` (`develop` branch, 2026-11-22)
- **License**: `AGPL-3.0`
- **Status**: **GO (with conditions)** — proceed to `#77` (`AIDE-BIGCAP-02`) with isolated service deployment and strict AGPL-3.0 boundary controls.

---

## 1. Baseline & Upgrade Strategy

- **Pinned Commit**: `607f10a43d7ae9418c6ae50a4e38d262f161a9c4`
- **Upstream Patch Policy**: Maintain a clean `oliver4441/bigcapital` fork with `aide/*` feature branches; avoid touching core accounting engine files where possible so upstream security/bugfix merges remain low-conflict.
- **Upgrade Strategy**:
  - Monthly rebase/merge from `bigcapitalhq/bigcapital@develop` into a staging branch.
  - Run full DB migration dry-runs and accounting smoke tests before promoting to production.
  - Pin Node.js, pnpm/npm, and database engine versions in container images.

---

## 2. License & Legal Compliance (`AGPL-3.0`)

| Item | Assessment | Action Required |
|---|---|---|
| **AGPL-3.0 Network-Source Obligation** | Any modified Bigcapital service exposed over a network (including via Aide proxy/iframe) triggers AGPL-3.0 Section 13 source-availability obligations for the Bigcapital service. | Publish the `oliver4441/bigcapital` fork source (or provide a corresponding source download link in the Aide footer/About modal) whenever Bigcapital is deployed. Keep Aide's own Next.js/Android codebase decoupled via HTTP APIs so Aide's proprietary/separate modules are not linked into Bigcapital. |
| **Copyright & License Notices** | Must preserve all upstream copyright headers and `LICENSE` file. | Retain `LICENSE` and attribution notices in the fork. |
| **Trademark Use** | "Bigcapital" name/logos are trademarks of BigcapitalHQ. | Replace UI branding/logos with Aide branding (`#79` `AIDE-BIGCAP-04`) while keeping required license/attribution notices in source and `/about` or `/licenses`. |
| **EE / Commercial Modules** | Upstream may contain enterprise/commercial directories or feature flags. | Audit and disable/exclude any non-AGPL enterprise modules unless explicitly licensed. |

---

## 3. Architecture, API & Integration Inventory

- **Auth & Tenant Provisioning**: Bigcapital uses organization-scoped multi-tenancy with JWT/session auth and per-tenant database/schema isolation. Aide will bridge identity & tenant provisioning via `#78` (`AIDE-BIGCAP-03`).
- **API & Extension Points**: REST API for accounts, journal entries, invoices, bills, payments, items, contacts, and financial reports. Aide will wrap these behind an internal Accounting Adapter + transactional outbox (`#80` `AIDE-BIGCAP-05`).
- **DB Migrations & Jobs**: Knex/Objection-style migrations and background job queues (Bull/Redis) for async report generation and email/webhook delivery.

---

## 4. Security Review

| Area | Finding / Risk | Mitigation |
|---|---|---|
| **Authentication & JWT/Session** | Separate auth domain from Aide NextAuth. | Issue short-lived service/user tokens via `#78`; never expose raw Bigcapital admin credentials to browsers. |
| **Tenant Isolation & RBAC** | Report and export endpoints must strictly enforce `organizationId` / tenant context. | Enforce tenant ID on every adapter call and verify RBAC roles before proxying. |
| **File Uploads & SSRF** | Attachment uploads and webhook URLs can introduce SSRF or arbitrary file risks. | Restrict upload MIME types/sizes, store in isolated object storage, and block private/metadata IP ranges on outbound webhooks. |
| **Secrets & Dependencies** | Upstream dependencies require regular advisory checks. | Run `npm audit` / Dependabot in the fork and inject all secrets via environment/secret manager. |

---

## 5. Kenya Localization Fit

| Requirement | Fit | Notes |
|---|---|---|
| **Currency (`KES`)** | Native | Bigcapital supports multi-currency and `KES` as base currency. |
| **VAT & Withholding Tax** | Partial | Standard VAT rates (16%, 0%, Exempt) can be configured as tax rates; Kenya-specific withholding tax rules and eTIMS QR/control unit fields require Aide-native layer (`#83` `AIDE-BIGCAP-08`). |
| **eTIMS Feasibility** | External | Not native to Bigcapital; implement in Aide's Kenya tax engine (`#56`) and sync posted invoices. |
| **M-Pesa & Bank Imports** | External | Handled by Aide payment reconciliation (`#55`) and posted to Bigcapital via adapter. |
| **Timezone & Reports** | Native | Configure `Africa/Nairobi` (`UTC+3`) and map Aide report views in `#83`. |

---

## 6. Risk Register & Go/No-Go

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | AGPL-3.0 boundary violation if tightly coupled | High | Keep Bigcapital as an isolated HTTP service; publish fork source. |
| R2 | Tenant cross-talk in proxied report endpoints | High | Mandatory tenant-context middleware & integration tests (`#85`). |
| R3 | Upstream drift on heavily customized UI | Medium | Keep UI white-labeling minimal (`#79`) and build Kenya-specific UX in Aide (`#83`). |

**Decision**: **GO** — Baseline `607f10a43d7ae9418c6ae50a4e38d262f161a9c4` is approved for isolated deployment in `#77`.
