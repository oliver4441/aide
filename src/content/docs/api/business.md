## Reading your business

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://aide.omixsystems.store/api/business
```

```json
{
  "business": {
    "id": "bus_9d8e7f",
    "name": "Njeri Hair Studio",
    "type": "SALON",
    "slug": "njeri-hair-studio",
    "currency": "KSh",
    "taxRate": 16,
    "receiptFooter": "Karibu tena"
  }
}
```

The response is always `{ "business": ... }`. When the caller has no business, it
is `{ "business": null }` with status `200` — not an error.

### Notes

- **Session only.** This route checks the NextAuth session directly rather than
  `resolveUser`, so a bearer token is not sufficient here.
- **First membership only.** If you belong to several businesses, this returns your
  earliest-created one. There is no parameter to select a different membership.
- **Role must be `user`.** A platform administrator's session returns
  `{ "business": null }`, because admins act through `requireBusiness` elsewhere
  rather than through this route.

## Creating a business

```bash
curl -X POST https://aide.omixsystems.store/api/business \
  -H 'Content-Type: application/json' \
  -H "Cookie: next-auth.session-token=..." \
  -d '{ "name": "Njeri Hair Studio", "type": "SALON" }'
```

| Field | Required | Notes |
| --- | --- | --- |
| `name` | Yes | Trimmed. `400` if empty. |
| `type` | No | Uppercased. Defaults to `OTHER`. |

### Valid business types

`SALON`, `SHOP`, `RESTAURANT`, `GROCERY`, `PHARMACY`, `ELECTRONICS`, `CLOTHING`,
`OTHER`.

An unrecognised type falls back to `OTHER` rather than failing:

```js
const ALLOWED = ['SALON','SHOP','RESTAURANT','GROCERY','PHARMACY','ELECTRONICS','CLOTHING','OTHER'];
const resolved = ALLOWED.includes(type) ? type : 'OTHER';
```

### What is created for you

The new business is given:

- `currency: 'KSh'`
- `taxRate: 16`
- a generated slug — the name lowercased, non-alphanumerics collapsed to
  hyphens, with a timestamp suffix for uniqueness
- an `OWNER` membership for you, inside the same create

```json
{
  "business": {
    "id": "bus_3k9p2q",
    "name": "Njeri Hair Studio",
    "type": "SALON",
    "slug": "njeri-hair-studio-m4x2k1",
    "currency": "KSh",
    "taxRate": 16
  }
}
```

Status is `200`, not `201`.

## One business per owner

A user who already owns a business cannot create another:

```json
{ "error": "Business already exists" }
```

with status `409`. This is checked against an `OWNER` membership specifically, so
a user who is only a member of someone else's business can still create their
own.

> In practice most accounts never call this. Registration creates the first
> business already — see
> [Set up your business](/docs/getting-started/setup). This endpoint exists for
> accounts that registered before a business was attached.

## Business fields

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Immutable. Used by every other endpoint |
| `name` | string | Shown on receipts and reports |
| `type` | string | One of the eight types above |
| `slug` | string | URL-safe identifier, unique per business |
| `currency` | string | `KSh` by default |
| `taxRate` | number | `16` by default. The VAT rate in force in Kenya |
| `receiptFooter` | string \| null | Custom line printed at the foot of receipts |

Change these in **Settings** in the app. There is no public endpoint to update a
business.

## Business scoping on other endpoints

Every other business-data route resolves the business from your membership and
accepts an optional `businessId` to disambiguate. See
[Businesses, staff and permissions](/docs/concepts/businesses).

If you belong to several businesses, pass the id explicitly:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://aide.omixsystems.store/api/sync?businessId=bus_3k9p2q"
```

An id you are not a member of is ignored, and your first membership is used
instead.

## Related

- [Authentication](/docs/api/authentication)
- [Sync](/docs/api/sync)
- [Receipts](/docs/api/receipts) — `receiptFooter` appears on the receipt payload
