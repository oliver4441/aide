## How products work

A product is anything you sell: a physical item you hold stock of, or a service
you perform. The two are handled differently, and `isService` is the switch.

| Field | Meaning |
| --- | --- |
| `name` | Shown at the point of sale. Required. |
| `sku` | Your own stock-keeping code. Optional, not enforced unique. |
| `buyingPrice` | What you pay. Use `0` for services. |
| `sellingPrice` | What the customer pays. |
| `quantity` | Units on hand. |
| `lowStock` | Threshold for low-stock alerts. Defaults to `5`. |
| `isService` | `true` means this never decrements stock when sold. |
| `categoryId` | Which category it appears under. |
| `imageUrl` | Optional product photo. |
| `isActive` | `false` means deleted. See [soft deletes](#deleting-products). |

## Categories

Categories group products and fix their order at the till. Sort order is
controlled by `sortOrder` — lower comes first.

| Business | Typical categories |
| --- | --- |
| Salon | Hair services, Treatments, Products |
| Shop | Beverages, Snacks, Household, Toiletries |
| Pharmacy | Prescription, OTC, Vitamins, Personal care |
| Restaurant | Main, Sides, Drinks, Desserts |

Categories are listed with a live product count, which is how the app shows how
much sits under each heading.

## Adding products

### From the app

Open **Inventory**, choose a category, then **Add product**. Enter the name and
the two prices, set the opening quantity, and save. The product is written locally
and syncs in the background — you do not need a connection.

### From the API

```bash
curl -X POST https://aide.omixsystems.store/api/products \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Maid stout 500ml",
    "sku": "BEV-014",
    "buyingPrice": 80,
    "sellingPrice": 130,
    "quantity": 24,
    "lowStock": 6,
    "categoryId": "cat_bev"
  }'
```

See [Products](/docs/api/products) for the full request and response.

## Services versus stock

Set `isService` to `true` for anything you do not hold inventory of:

```json
{ "name": "Braids - medium", "sellingPrice": 2500, "buyingPrice": 0, "isService": true, "quantity": 0 }
```

The difference is enforced at the sale:

```js
// A service line never touches inventory.
if (item.productId && !item.isService) {
  await tx.product.updateMany({
    where: { id: item.productId, businessId },
    data: { quantity: { decrement: item.quantity } },
  });
}
```

If you leave `isService` as `false` on a haircut, every sale drives its quantity
negative and it will show up in low-stock alerts forever.

## Low-stock alerts

When a stock product falls to or below its `lowStock` threshold it appears:

- in the **low stock** list on the dashboard
- as an inventory notification, if you have those enabled

The threshold is per product. Bottled water and hair dye have different
reorder points, so set each one deliberately rather than leaving the default.
See [Notifications](/docs/guides/notifications) to choose which alerts you get.

## Adjusting stock

Edit the product and change `quantity`. Two rules are worth knowing:

- **Adjusting stock is not a sale.** It changes the count without creating a sale
  record or affecting your profit figures. Use it for deliveries, breakage and
  stock counts.
- **Sales adjust stock automatically.** You do not need to edit a product after a
  sale; the quantity is decremented as part of the sale.

For a stock count, edit each affected product's quantity to the counted figure.

## Deleting products

Deleting a product sets `isActive` to `false`. The row and its history stay in
place; it simply disappears from lists and from the point of sale.

This is deliberate. Sales reference products, so a hard delete would either erase
your sales history or leave dangling references. See
[How Aide stores your data](/docs/concepts/offline-first) for why deletes are soft
in an offline-first system.

Products with `isActive: false` are excluded from `GET /api/products`, and from
low-stock counts.

## Finding products

`GET /api/products` supports two filters, which can be combined:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://aide.omixsystems.store/api/products?categoryId=cat_bev&search=stout"
```

Results are ordered by name. `search` is a case-insensitive match on the product
name.

## Next

[Point of sale](/docs/guides/pos) — selling these products.
