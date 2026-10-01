## What the dashboard shows

The dashboard is the morning check: what happened yesterday, what is low, what is
new.

| Card | Meaning |
| --- | --- |
| Today's sales | Sum of `total` for sales since midnight, in the server's timezone |
| Today's profit | Sum of `profit` for the same sales |
| Sales count | Number of sales today |
| Products | Count of active products |
| Low stock | Up to 5 active, non-service products at or below their threshold |
| Recent sales | The 5 most recent, newest first |
| Change vs yesterday | Percentage difference in today's total against yesterday's |

`salesChange` is `(today - yesterday) / yesterday x 100`, rounded. It reads `0`
when yesterday had no sales, rather than showing an infinite percentage.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://aide.omixsystems.store/api/dashboard
```

```json
{
  "todaySales": 48500,
  "todayProfit": 26100,
  "salesCount": 23,
  "totalProducts": 148,
  "lowStockItems": [
    { "id": "prd_014", "name": "Maid stout 500ml", "quantity": 4, "lowStock": 6 }
  ],
  "recentSales": [
    { "id": "sal_9c2e1", "total": 1800, "profit": 700, "createdAt": "2026-09-28T11:02:44.000Z" }
  ],
  "salesChange": 12
}
```

See [Dashboard](/docs/api/dashboard) for the reference.

## Reading profit honestly

`profit` is `total - cost`, where `cost` is the `buyingPrice` recorded on each
line at the moment of sale. Three consequences worth internalising:

- **Services show their margin.** A haircut with `buyingPrice: 0` reports 100%
  margin, because Aide does not know what your time is worth. For service
  businesses, set a `buyingPrice` that represents your real cost per hour.
- **It is not net profit.** Rent, wages, electricity and transport are not
  included.
- **It does not change retroactively.** Raising a product's `buyingPrice` changes
  future profit, not past sales.

## Sales history

**Sales** lists every sale newest first, with its total, profit, payment method
and the cashier who rang it.

Filter by date range for a specific day or week. The API pages through history:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://aide.omixsystems.store/api/sales?limit=20&offset=40"
```

```json
{ "sales": [ /* ... */ ], "total": 312 }
```

`limit` defaults to `50`, `offset` to `0`. `total` is the count of **all** sales
for the business, so it is your pagination cursor, not the length of the page
returned.

See [Sales](/docs/api/sales).

## Reports

Three reports cover most decisions:

### Sales report

Revenue and profit for a date range, broken down by day. Use it to find your best
day and to spot a quiet week before it costs you.

### Inventory report

Current stock per product, with cost and retail value. Use it for reordering and
for stock counts.

> The dashboard's `stockValue` aggregate sums `sellingPrice` across active,
> non-service products. It reflects retail value at the last-known quantities, so
> treat it as a pricing check rather than an accounting figure.

### Profit report

Where the money came from. Because `cost` is captured per line at sale time, this
is accurate for stock you have priced correctly — and only as good as your
`buyingPrice` data. See the note above.

## Reconciliation

For daily M-Pesa reconciliation, filter sales by payment method over the day and
compare the total against your provider's statement. Because `paymentMethod` is
recorded per sale, this is a direct comparison rather than a reconstruction.

## Reading reports offline

Reports read from the local database, so they work with no connection and include
sales that have not yet synced. That means a report taken on a device mid-day may
show slightly different totals from the dashboard on another device — one is
local, one is server-side. Once the outbox drains, they agree.

This is expected behaviour rather than a bug. See
[How Aide stores your data](/docs/concepts/offline-first).

## Next

[Notifications](/docs/guides/notifications), or the
[Sales](/docs/api/sales) endpoint reference.
