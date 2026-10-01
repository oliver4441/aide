A receipt is a sale plus the business details needed to render it on paper or on a
phone. There is one route, and it is read-only.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://aide.omixsystems.store/api/receipts/sal_77c1
```

```json
{
  "sale": {
    "id": "sal_77c1",
    "total": 640,
    "cost": 400,
    "profit": 240,
    "paid": 1000,
    "change": 360,
    "paymentMethod": "CASH",
    "notes": null,
    "businessId": "bus_9d8e7f",
    "createdAt": "2026-09-28T16:21:09.000Z",
    "items": [
      {
        "id": "itm_4410",
        "saleId": "sal_77c1",
        "name": "Maid stout 500ml",
        "quantity": 4,
        "price": 130,
        "cost": 80,
        "productId": "prd_014"
      }
    ],
    "business": {
      "name": "Kijani Stores",
      "type": "RETAIL",
      "currency": "KES",
      "taxRate": 16,
      "receiptFooter": "Karibu tena! Asante sana."
    }
  }
}
```

## What is included

The sale is returned with `items`, plus a **narrow projection** of the business:

| Field | Use on the receipt |
| --- | --- |
| `name` | Header |
| `type` | Optional label (retail, wholesale, services) |
| `currency` | Currency symbol and formatting |
| `taxRate` | Display only — no tax is computed here |
| `receiptFooter` | Closing line |

Only those five business fields are selected. Anything else on the business
record — including its id — is not in the response.

> `taxRate` is echoed so you can *display* it. `tax` and `taxRate` are not
> written to the sale by [`POST /api/sales`](/docs/api/sales), so the receipt's
> `total` is the figure you charged. If your prices are tax-inclusive, say so in
> the footer rather than deriving a tax line from this value.

## Item lines are snapshots

Each item carries its own `name`, `price` and `cost` as they were at the moment
of sale. Editing or deleting the product afterwards does not change a historic
receipt — `productId` may point at a product that is now `isActive: false`, or
at no product at all.

## Not found

```json
{ "error": "Receipt not found" }
```

with status `404`. The lookup is:

```js
prisma.sale.findFirst({
  where: { id: params.id, businessId },
  include: { items: true, business: { select: { ... } } },
});
```

`businessId` comes from your membership, so a sale id belonging to another
business is simply not found. A missing sale and someone else's sale produce
byte-identical responses — deliberate, and covered in
[Businesses, staff and permissions](/docs/concepts/businesses).

## Methods

Only `GET` is implemented on this route. There is no `POST` to create a receipt,
and no `PATCH` or `DELETE`:

| Method | Result |
| --- | --- |
| `GET /api/receipts/{id}` | The receipt (authenticated) |
| `POST /api/receipts` | `405` — the route does not exist |
| `DELETE /api/receipts/{id}` | `405` |

Receipts are produced by recording a sale; see
[Sales](/docs/api/sales). There is no reprint endpoint, but `GET` on a known
sale id is idempotent and can be called any number of times — which is what the
app does.

## Sharing a receipt with a customer

This route needs credentials, so it cannot serve the customer who scans the QR
code printed on their receipt. Sharing uses two other routes.

### Mint the link

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://aide.omixsystems.store/api/sales/sale_1731_a7f2c9/share
```

```json
{ "url": "https://aide.omixsystems.store/r/sale_1731_a7f2c9?t=8Kf2…" }
```

Authenticated and scoped to your business, so you can only mint links for your
own sales. The QR code on a printed receipt and the **Send to Customer** button
both use this URL.

### Read it back

```bash
curl "https://aide.omixsystems.store/api/public/receipts/sale_1731_a7f2c9?t=8Kf2…"
```

Public — no credentials. The `t` parameter is an **HMAC of the sale id** signed
with `NEXTAUTH_SECRET`, and it is required. Without a valid token the response is
the same `404` as a sale that does not exist, so the endpoint cannot be used to
probe which ids are real.

> Why a token instead of a plain id? Sale ids are generated on the device as
> `sale_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` — a millisecond
> timestamp plus six base36 characters from a non-cryptographic source. That is
> enumerable. Publishing this route keyed on the id alone would have exposed
> every customer's receipt to anyone prepared to walk a plausible timestamp
> range. The token is what makes the link a capability rather than a guess.

The public projection is deliberately narrower than the authenticated one. It
omits `cost`, `profit`, `notes` and `businessId` — purchase cost and margin are
the merchant's, not the customer's:

| Field | Public | Authenticated |
| --- | --- | --- |
| `id`, `total`, `paid`, `change`, `tax`, `taxRate`, `paymentMethod`, `cashier`, `createdAt` | yes | yes |
| `items[] { id, name, quantity, price }` | yes | yes (plus `cost`, `productId`) |
| `business { name, type, currency, taxRate, receiptFooter }` | yes | yes |
| `cost`, `profit`, `notes`, `businessId` | no | yes |

## Reprinting offline

A device that has been offline still has the sale and its items locally, so the
app prints from the local database rather than waiting for this route. It also
caches the signed share URL against the sale id when it is minted, so a reprint
while offline still puts a working QR on the paper.

## Status codes

| Status | Body | Cause |
| --- | --- | --- |
| `200` | `{ sale }` | Found |
| `401` | `{ "error": "Unauthorized" }` | No credentials, or no business membership |
| `404` | `{ "error": "Receipt not found" }` | No such sale in your business |
| `500` | `{ "error": "<message>" }` | Unexpected failure |

## Related

- [Make your first sale](/docs/getting-started/first-sale)
- [Point of sale](/docs/guides/pos)
- [Sales](/docs/api/sales)
- [Errors and status codes](/docs/api/errors)
