## List products

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://aide.omixsystems.store/api/products?categoryId=cat_bev&search=stout"
```

Returns a **bare JSON array** of active products, ordered by name ascending, each
with its `category` relation included.

### Query parameters

| Parameter | Effect |
| --- | --- |
| `categoryId` | Exact match on category |
| `search` | Case-insensitive substring match on `name` |

Both are optional and combine. Only `isActive: true` products are returned, so
deleted products never appear here.

```json
[
  {
    "id": "prd_014",
    "name": "Maid stout 500ml",
    "sku": "BEV-014",
    "buyingPrice": 80,
    "sellingPrice": 130,
    "quantity": 24,
    "lowStock": 6,
    "isService": false,
    "isActive": true,
    "categoryId": "cat_bev",
    "imageUrl": null,
    "businessId": "bus_9d8e7f",
    "createdAt": "2026-09-20T07:11:04.000Z",
    "updatedAt": "2026-09-28T10:58:12.000Z",
    "category": { "id": "cat_bev", "name": "Beverages", "sortOrder": 0 }
  }
]
```

The business is resolved from your membership. There is no `businessId` parameter
on this route.

## Create a product

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
    "categoryId": "cat_bev",
    "imageUrl": "https://example.co.ke/img/maid.jpg"
  }'
```

Returns `201` with the created product.

| Field | Required | Default if omitted |
| --- | --- | --- |
| `name` | Yes | — `400 { "error": "name required" }` |
| `sku` | No | `null` |
| `buyingPrice` | No | `parseFloat(undefined)` → `NaN` |
| `sellingPrice` | No | `parseFloat(undefined)` → `NaN` |
| `quantity` | No | `0` |
| `lowStock` | No | `5` |
| `isService` | No | `false` |
| `categoryId` | No | `null` |
| `imageUrl` | No | `null` |
| `thumbnailUrl` | No | `null` |

> Always send both prices. They are passed through `parseFloat` without a
> fallback, so omitting them stores `NaN`, which then poisons profit figures on
> every sale of that product.

`businessId` is never taken from the body — it comes from your membership.

## Read a product

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://aide.omixsystems.store/api/products/prd_014
```

Returns the product itself, not wrapped, including its `category`.

If the product does not exist **or belongs to another business**, the response is
identical:

```json
{ "error": "Product not found" }
```

with status `404`. From the caller's perspective a record that is not theirs and a
record that does not exist are the same thing — see
[Businesses, staff and permissions](/docs/concepts/businesses).

> This route scopes by **membership** rather than by a resolved business id, so
> a product belonging to any business you are a member of is readable.

## Update a product

```bash
curl -X PATCH https://aide.omixsystems.store/api/products/prd_014 \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "sellingPrice": 140, "quantity": 20 }'
```

Only fields **present** in the body are changed. Fields are applied individually
rather than spread, so unknown keys are ignored:

```js
const data = {};
if (body.name !== undefined) data.name = body.name;
if (body.sellingPrice !== undefined) data.sellingPrice = parseFloat(body.sellingPrice);
if (body.categoryId !== undefined) data.categoryId = body.categoryId || null;
if (body.isActive !== undefined) data.isActive = body.isActive;
```

Passing `null` for `categoryId` or `imageUrl` clears it, because of the
`|| null`. Omitting the field leaves it unchanged.

Updatable fields: `name`, `sku`, `buyingPrice`, `sellingPrice`, `quantity`,
`lowStock`, `isService`, `categoryId`, `isActive`, `imageUrl`, `thumbnailUrl`.

Returns the updated product, or `404` as above.

## Delete a product

```bash
curl -X DELETE https://aide.omixsystems.store/api/products/prd_014 \
  -H "Authorization: Bearer $TOKEN"
```

```json
{ "ok": true }
```

Deletion is **soft**. `isActive` is set to `false`; the row and its sales history
remain. This is deliberate — sales reference products, and an offline device may
still hold the product it believes it deleted. See
[How Aide stores your data](/docs/concepts/offline-first).

To bring a product back, `PATCH` it with `{ "isActive": true }`.

## Status codes

| Status | Body | Cause |
| --- | --- | --- |
| `200` | record or `{ ok: true }` | Success |
| `201` | record | Created |
| `400` | `{ "error": "name required" }` | Creating without a name |
| `401` | `{ "error": "Unauthorized" }` | No credentials |
| `404` | `{ "error": "Product not found" }` | Missing, or another business's product |

There is no `403` on these routes. See
[Errors and status codes](/docs/api/errors).

## Working with products offline

If you are building a client that supports offline use, do not use this endpoint
as your store. Read from the local database and queue writes, then push through
[POST /api/sync](/docs/api/sync) — that is how the Aide app keeps working without
a connection. See [Sync and conflict resolution](/docs/concepts/sync).

## Related

- [Products and categories](/docs/guides/products) — how they behave in the app
- [Sales](/docs/api/sales) — how `buyingPrice` becomes `cost`
- [Categories](/docs/api/categories)
