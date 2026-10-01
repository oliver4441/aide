## List categories

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://aide.omixsystems.store/api/categories
```

Returns a **bare JSON array**, ordered by `sortOrder` ascending, each with a
live product count.

```json
[
  {
    "id": "cat_bev",
    "name": "Beverages",
    "sortOrder": 0,
    "businessId": "bus_9d8e7f",
    "createdAt": "2026-09-20T07:05:00.000Z",
    "_count": { "products": 42 }
  },
  {
    "id": "cat_snk",
    "name": "Snacks",
    "sortOrder": 1,
    "businessId": "bus_9d8e7f",
    "createdAt": "2026-09-20T07:05:40.000Z",
    "_count": { "products": 18 }
  }
]
```

`_count.products` counts every product in the category, including those with
`isActive: false`. If you need only active products, filter client-side or use
[Products](/docs/api/products).

There are no query parameters on this route; the business comes from your
membership.

## Create a category

```bash
curl -X POST https://aide.omixsystems.store/api/categories \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "name": "Beverages", "sortOrder": 0 }'
```

Returns `201` with the created category.

| Field | Required | Notes |
| --- | --- | --- |
| `name` | Yes | Must be a string. `400 { "error": "name required" }` otherwise |
| `sortOrder` | No | Defaults to `0` when omitted or falsy |

`name` is validated by type as well as presence, so `{"name": 42}` is rejected
rather than stored:

```js
if (!body.name || typeof body.name !== 'string') {
  return NextResponse.json({ error: 'name required' }, { status: 400 });
}
```

`businessId` is never taken from the body.

## Ordering

`sortOrder` is the only thing controlling display order, and it is applied as a
plain ascending sort. There is no "move up" endpoint and no automatic reordering:
to put a category first, `PATCH` it — except that this route has no `PATCH`.

> **Known limitation:** only `GET` and `POST` exist on `/api/categories`. To
> rename a category or change its order, either do it in the app's Settings, or
> delete and recreate it through [`POST /api/sync](/docs/api/sync) with a
> `categories` mutation, which does accept updates.

Products can be reassigned with
[`PATCH /api/products/{id}`](/docs/api/products).

## Deleting a category

Deletion happens through the sync endpoint rather than a REST route:

```json
{
  "deviceId": "dev_1731_a7f2c9",
  "mutations": [
    { "table": "categories", "action": "delete", "recordId": "cat_snk", "data": {} }
  ]
}
```

Category deletion is a **hard** delete, unlike products:

```js
await prisma.category.deleteMany({ where: { id: recordId, businessId } });
```

The `businessId` predicate means you can only delete your own categories. A
category id belonging to another business simply matches nothing.

> Deleting a category does not delete the products inside it. Those products are
> left without a category — `categoryId` becomes orphaned. Reassign them before
> they appear without a heading in the point of sale.

## Status codes

| Status | Body | Cause |
| --- | --- | --- |
| `200` | array | List |
| `201` | category | Created |
| `400` | `{ "error": "name required" }` | Missing or non-string name |
| `401` | `{ "error": "Unauthorized" }` | No credentials, or no business membership |

## Related

- [Products and categories](/docs/guides/products)
- [Products](/docs/api/products)
- [Sync](/docs/api/sync)
