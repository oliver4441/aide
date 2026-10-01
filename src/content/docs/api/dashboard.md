One `GET`, no parameters, everything the home screen needs.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://aide.omixsystems.store/api/dashboard
```

```json
{
  "todaySales": 18400,
  "todayProfit": 5620,
  "salesCount": 27,
  "totalProducts": 63,
  "lowStockItems": [
    {
      "id": "prd_088",
      "name": "Sugar 1kg",
      "quantity": 4,
      "lowStock": 6,
      "sellingPrice": 180
    }
  ],
  "recentSales": [
    { "id": "sal_77c1", "total": 640, "createdAt": "2026-09-28T16:21:09.000Z",
      "items": [] }
  ],
  "salesChange": 12
}
```

## Fields

| Field | Type | Meaning |
| --- | --- | --- |
| `todaySales` | number | Sum of `total` for sales since local midnight; `0` when none |
| `todayProfit` | number | Sum of `profit` over the same sales; `0` when none |
| `salesCount` | number | Number of sales since local midnight |
| `totalProducts` | number | Count of products with `isActive: true` |
| `lowStockItems` | array | Up to 5 products needing a reorder |
| `recentSales` | array | The 5 newest sales, with `items` |
| `salesChange` | number | Percent change in sales value vs yesterday, rounded |

## "Today" is local midnight

```js
const today = new Date();
today.setHours(0, 0, 0, 0);
```

Midnight is computed in the **server's** timezone, not the caller's. A shop in
Nairobi and a server in UTC will disagree about where the day starts. If your
figures look shifted by a few hours, this is why.

Yesterday's comparison window is `[yesterday midnight, today midnight)`.

## `salesChange` is a comparison, not a growth rate

```js
const salesChange = yesterdayTotal > 0
  ? ((todayTotal - yesterdayTotal) / yesterdayTotal * 100)
  : 0;
```

- It compares a **partial** today against a **complete** yesterday, so at 9am it
  will almost always read negative. This is not a bug.
- When yesterday had no sales, the value is `0` — not `100` and not `null`. A
  first-day business cannot tell "no change" from "first day ever".
- The result is `Math.round`ed, so it is an integer percentage.

Negative values are legitimate. Render the sign.

## Low stock is a hard-coded threshold

```js
lowStockItems: prisma.product.findMany({
  where: {
    businessId,
    isActive: true,
    isService: false,
    quantity: { lte: prisma.product.fields?.lowStock as any ?? 5 },
  },
  orderBy: { quantity: "asc" },
  take: 5,
})
```

`prisma.product.fields` does not exist on a Prisma client, so the expression
always evaluates to the fallback of `5`. In practice this means:

- The **per-product `lowStock` column is ignored** on this endpoint. A product
  you set to alert at `20` will not appear until its quantity drops to `5`.
- Services are excluded, so a service never shows as low.
- Results are sorted ascending by quantity — the emptiest shelves first — and
  capped at 5.
- `totalProducts` includes services; `lowStockItems` does not.

To honour each product's own threshold, filter
[`GET /api/products`](/docs/api/products) client-side on `quantity <= lowStock`,
or track it in the app, which does use the per-product value.

## No parameters, no date range

The business is resolved from your membership. There is no `businessId` query
parameter and no way to ask for a different day, week or month from this route.
For arbitrary ranges, aggregate [`GET /api/sales`](/docs/api/sales) or
[`GET /api/sync`](/docs/api/sync) yourself — which is what the app's reports
screen does. See [Reports and analytics](/docs/guides/reports).

## A note on `stockValue`

The handler computes a stock valuation query internally, but it is **not**
included in the response. Only the seven fields above are returned; anything
else you may have seen in an older example is not served.

## Cost

Four aggregate queries plus two single queries per request, unscoped by date on
`totalProducts`. It is a landing-page endpoint, not a reporting one. Cache it in
your client for the length of a screen visit rather than polling it on a tight
timer.

## Status codes

| Status | Body | Cause |
| --- | --- | --- |
| `200` | the object above | Success |
| `401` | `{ "error": "Unauthorized" }` | No credentials, or no business membership |
| `500` | `{ "error": "<message>" }` | Unexpected failure |

## Related

- [Reports and analytics](/docs/guides/reports)
- [Sales](/docs/api/sales)
- [Products](/docs/api/products)
- [Errors and status codes](/docs/api/errors)
