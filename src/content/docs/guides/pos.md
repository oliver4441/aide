## The till

The point of sale is the screen your staff spends their day in, so it is built
around speed and around never failing. It reads from the device's local database,
which is why it opens instantly and works with no connection at all.

## Adding items

Three ways, all local:

- **Search** — type part of the product name. Matches are case-insensitive.
- **Browse by category** — categories appear in the order you set, with a product
  count on each heading.
- **Tap to repeat** — tapping a product already in the basket increments its
  quantity rather than adding a second line.

Change the quantity or remove a line with the basket controls. Removing a line
does not put stock back — nothing was ever decremented until the sale completes.

## What the totals mean

| Figure | Definition |
| --- | --- |
| `total` | Sum of `price x quantity` across lines |
| `cost` | Sum of `cost x quantity` — what the stock cost you |
| `profit` | `total - cost` |
| `paid` | What the customer handed over. Defaults to `total`. |
| `change` | `paid - total` |

Aide does not accept a client-supplied total. It is computed server-side from the
line items every time:

```js
const items = body.items.map((item) => {
  const itemTotal = item.price * item.quantity;
  const itemCost = item.cost * item.quantity;
  total += itemTotal;
  cost += itemCost;
  return { name: item.name, quantity: item.quantity, price: item.price, cost: item.cost };
});

await tx.sale.create({
  data: { total, cost, profit: total - cost, paid: body.paid || total, change: (body.paid || total) - total },
});
```

> Because totals are derived from line items, a line must carry the price it was
> sold at. Editing a product's `sellingPrice` later does not rewrite historic
> sales.

## Payment methods

`paymentMethod` accepts `CASH`, `CARD` and `M-PESA`, and defaults to `CASH` if
omitted. Choose the method before completing the sale; it is recorded on the sale
and shown in reports, which is how you reconcile M-Pesa takings at the end of the
day.

> Aide records the fact and the amount of a payment. It does not integrate with a
> payment processor, so card and M-Pesa entries are a record of what you took
> rather than a settlement. Confirm the transfer in the normal way for your
> provider.

## Completing the sale

Tapping **Complete sale** does four things:

1. Writes the sale and its items to the local database
2. Decrements stock for every line that is **not** a service
3. Adds a mutation to the outbox for sync
4. Shows the receipt

Steps 1 to 3 happen offline. If the connection is down the sale is complete
regardless, and it reaches the server at the next sync.

### Stock is only decremented for stock items

```js
if (item.productId && !item.isService) {
  await tx.product.updateMany({
    where: { id: item.productId, businessId },
    data: { quantity: { decrement: item.quantity } },
  });
}
```

Products with `isService: true` — and items with no `productId` at all, such as a
free-form line — leave inventory untouched.

## Recording a sale outside the app

A sale is just items, so a script or another system can record one:

```bash
curl -X POST https://aide.omixsystems.store/api/sales \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [
      { "name": "Maid stout 500ml", "quantity": 2, "price": 130, "cost": 80, "productId": "prd_014" },
      { "name": "Samosa", "quantity": 1, "price": 50, "cost": 25, "productId": "prd_022", "isService": false }
    ],
    "paid": 500,
    "paymentMethod": "CASH",
    "notes": "Table 4"
  }'
```

Passing `productId` links the line to your catalogue so stock decrements. Omit it
for an ad-hoc line. Include `isService: true` for a catalogue product you do not
want to decrement.

See [Sales](/docs/api/sales) for the full response shape.

## Receipts

After completing a sale you can print, share or skip the receipt.

Every sale has a permanent link at `/r/<sale-id>`. Those links can be shared in a
message — WhatsApp receipts are common for delivery orders — and they work from
any device. To fetch the underlying data, see [Receipts](/docs/api/receipts).

To reprint, open **Sales**, find the sale and choose **Receipt**.

## Selling from two devices at once

Both devices can sell the same product. Each sale is recorded, and if their
combined effect oversells the available stock, Aide flags it for review rather
than discarding the sale. See
[Sync and conflict resolution](/docs/concepts/sync) for what that looks like.

## Common problems

### A product is missing from the till

It is either in another category, or `isActive` is `false` from a previous
delete. Check **Inventory** and its category.

### Stock went negative

The product is probably a service that was never marked `isService`. Edit it and
set its quantity back to the correct figure. See
[Products and categories](/docs/guides/products).

### A sale is missing from the till on another device

It is probably still in the outbox. The other device shows it once sync runs —
every 30 seconds, or immediately when connectivity returns.

### The change figure looks wrong

`change` is `paid - total`. If the customer paid exactly the total, record `paid`
as the total; if you want change forced to zero, send `paid` equal to `total`.

## Next

[Reports and analytics](/docs/guides/reports)
