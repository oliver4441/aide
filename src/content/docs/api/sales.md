## List sales

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://aide.omixsystems.store/api/sales?limit=20&offset=0"
```

| Parameter | Default | Notes |
| --- | --- | --- |
| `limit` | `50` | `parseInt` of the value; not clamped |
| `offset` | `0` | Use with `limit` to page |

Returns the sales **newest first**, each with its `items` array, plus a `total`
count for the business.

```json
{
  "sales": [
    {
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
      ]
    }
  ],
  "total": 318
}
```

`total` is the count of **all** sales in the business, not the length of the
returned page. Compute page count as `Math.ceil(total / limit)`.

There is no date filter on this route. `GET /api/dashboard` covers today, and
the app's reports page queries through the sync endpoint for range queries.

## Create a sale

```bash
curl -X POST https://aide.omixsystems.store/api/sales \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [
      { "name": "Maid stout 500ml", "quantity": 4, "price": 130, "cost": 80,
        "productId": "prd_014", "isService": false }
    ],
    "paid": 1000,
    "paymentMethod": "MPESA",
    "notes": "Table 4"
  }'
```

Returns `201` with the created sale, `items` included.

### Required

`items` must be a **non-empty array**. Anything else is rejected before any
database work:

```json
{ "error": "items array required" }
```

with status `400`.

### Per-item fields

| Field | Required | Notes |
| --- | --- | --- |
| `name` | Yes | Stored verbatim, so send the display name |
| `quantity` | Yes | Multiplies into both totals |
| `price` | Yes | Selling price per unit |
| `cost` | Yes | **Sending price per unit** — see below |
| `productId` | No | Links the line to a product; enables stock decrement |
| `isService` | No | Client-supplied flag; blocks the stock decrement |

> `cost` is not computed for you. It is whatever you send, multiplied by
> `quantity`, and it is subtracted from `total` to produce `profit`. The server
> does **not** look up the product's `buyingPrice` — if you send `0` as a
> placeholder, the sale reports full revenue as profit.

`productId` is used for stock only. The line keeps the `name`, `price` and
`cost` you sent, so historical line items are unaffected by later price edits.

### Sale-level fields

| Field | Default | Notes |
| --- | --- | --- |
| `paid` | computed `total` | Amount tendered |
| `paymentMethod` | `"CASH"` | Any string; the app uses `CASH`, `CARD`, `MPESA` |
| `notes` | `null` | Free text |
| `tax`, `taxRate` | not set | **Ignored** on this route — they exist in the schema but are not written here. Use [`POST /api/sync`](/docs/api/sync) if you need tax fields |

`change` is always derived, never accepted:

```js
paid: body.paid || total,
change: (body.paid || total) - total,
```

Omitting `paid` therefore records an exact-tender sale with `change: 0`. Passing
a partial payment produces a **negative** change — no validation rejects
underpayment.

## Stock is decremented here

After the sale is created, inside the same transaction:

```js
for (const item of body.items) {
  if (item.productId && !item.isService) {
    await tx.product.updateMany({
      where: { id: item.productId, businessId },
      data: { quantity: { decrement: item.quantity } },
    });
  }
}
```

Four consequences worth designing around:

- **`businessId` is in the `where` clause.** A sale cannot decrement another
  tenant's stock by referencing a foreign `productId`; the update simply
  matches nothing.
- **`isService` is read from the request, not the product.** The database
  column is ignored here. Send `isService: true` on lines for services.
- **Overselling is allowed.** There is no quantity guard on this route; stock
  can go negative. [`POST /api/sync`](/docs/api/sync) does check and reports a
  conflict.
- **Decrement and sale commit together.** A failure in either rolls back both.

## Sale identity

Unlike [`POST /api/products`](/docs/api/products), this route does **not** accept
a client-supplied `id`. The database assigns it, which makes retries
duplicating: posting the same basket twice creates two sales and decrements
stock twice. For idempotent writes from an offline queue, use
[`POST /api/sync`](/docs/api/sync), where the client owns the id and a
re-delivered mutation is ignored.

## Fetching a receipt

A single sale with its business details for printing:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://aide.omixsystems.store/api/receipts/sal_77c1
```

See [Receipts](/docs/api/receipts).

## Status codes

| Status | Body | Cause |
| --- | --- | --- |
| `200` | `{ sales, total }` | List |
| `201` | sale | Created |
| `400` | `{ "error": "items array required" }` | Missing, empty or non-array `items` |
| `401` | `{ "error": "Unauthorized" }` | No credentials, or no business membership |
| `500` | `{ "error": "<message>" }` | Unexpected failure; see [Errors](/docs/api/errors) |

## Related

- [Make your first sale](/docs/getting-started/first-sale)
- [Point of sale](/docs/guides/pos)
- [Reports and analytics](/docs/guides/reports)
- [Sync](/docs/api/sync)
- [Receipts](/docs/api/receipts)
