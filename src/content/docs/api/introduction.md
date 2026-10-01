## Base URL

```text
https://aide.omixsystems.store
```

Every route below is relative to that host. There is no version prefix in the
path today; if a breaking change is ever needed it would arrive as a new version
segment with the previous version kept alive.

## Conventions

| Rule | Detail |
| --- | --- |
| Format | JSON in, JSON out |
| Request content type | `application/json` on every request with a body |
| Field names | `camelCase` |
| Timestamps | ISO 8601 in UTC, e.g. `2026-09-28T11:02:44.000Z` |
| Identifiers | Opaque strings. Do not parse them or infer meaning from their shape. |
| Money | Plain numbers in the business currency (`KSh` by default). Not minor units. |
| Authentication | Session cookie, or `Authorization: Bearer <token>` |

### Example request

```bash
curl -X POST https://aide.omixsystems.store/api/sales \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [
      { "name": "Maid stout 500ml", "quantity": 2, "price": 130, "cost": 80, "productId": "prd_014" }
    ],
    "paid": 500,
    "paymentMethod": "M-PESA"
  }'
```

## Response shapes

Aide is not uniform about envelopes. This is accurate, and worth internalising
before writing a client:

| Endpoint shape | Returns |
| --- | --- |
| Single record (`GET /api/products/{id}`) | The record itself, not wrapped |
| Collection (`GET /api/products`, `/api/categories`) | A bare JSON array |
| Paginated (`GET /api/sales`) | `{ sales, total }` |
| Single item under a key (`GET /api/dashboard`, `/api/receipts/{id}`, `/api/business`) | `{ ... }` with one named key |
| List under a key (`GET /api/notifications`) | `{ notifications }` |
| Created record | The record, with `201` |

There is no `data` envelope anywhere. A client must handle a bare array and a
bare object depending on the route.

## Status codes

| Code | Meaning here |
| --- | --- |
| `200` | Success, including `{ "skipped": true }` when a notification preference suppressed a write |
| `201` | A record was created |
| `400` | Validation failure — a required field is missing or the body is malformed |
| `401` | Missing, invalid or expired credentials, or no business membership |
| `403` | Authenticated, but the role is not permitted — admin-only routes |
| `404` | Not found, or the record belongs to another business |
| `500` | Unexpected server error |

Every 4xx and 5xx response is `{ "error": "<message>" }`.

> `403` appears only on the admin-only endpoints. Every business-data route
> answers `401` or `404` instead — see
> [Businesses, staff and permissions](/docs/concepts/businesses).

See [Errors and status codes](/docs/api/errors) for the full list.

## Which endpoints need authentication

| Endpoint | Auth |
| --- | --- |
| `POST /api/auth/register` | None |
| `POST /api/auth/mobile-login` | None |
| `GET /api/releases` | None |
| `GET /api/latest-release` | None |
| `POST /api/reviews` | None (a session is attached if present) |
| Everything under `/api/auth/[...nextauth]` | NextAuth |
| `GET /api/admin/stats`, `GET /api/reviews`, `GET /api/reviews/{id}` | Session, `admin` role |
| All other business endpoints | Session **or** bearer token, plus business membership |

See [Authentication](/docs/api/authentication).

## Business scoping

Every business-data endpoint resolves a business from your membership, not from
the request alone. Passing a `businessId` you are not a member of is ignored
rather than rejected, so a stale id in a client degrades gracefully instead of
breaking.

## Not covered by these docs

- **The NextAuth flow** — `/api/auth/[...nextauth]` is standard NextAuth v4 with a
  credentials provider. Sign in through the UI at [/login](/login).
- **Dashboard screens** — these pages document behaviour; they are not a
  substitute for the app.
- **Internal admin tooling** — beyond `GET /api/admin/stats` and reading reviews.
