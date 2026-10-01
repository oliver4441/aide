`/api/sync` is the endpoint an offline-first client uses. It is the only Aide
endpoint that does both halves of replication in one place: it **pushes** a
batch of local mutations and (on `GET`) **pulls** everything changed since a
cursor.

If you are writing a client that must survive a lost connection, this is the
only endpoint you need for writes. See
[Sync and conflict resolution](/docs/concepts/sync) for the model behind it.

## Push mutations

```bash
curl -X POST https://aide.omixsystems.store/api/sync \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "deviceId": "dev_1731_a7f2c9",
    "mutations": [
      { "table": "products", "action": "upsert", "recordId": "prd_014",
        "data": { "name": "Maid stout 500ml", "sku": "BEV-014",
                  "buyingPrice": 80, "sellingPrice": 130, "quantity": 24,
                  "lowStock": 6, "isService": false, "categoryId": "cat_bev",
                  "updatedAt": "2026-09-28T10:58:12.000Z" } },
      { "table": "products", "action": "delete", "recordId": "prd_031", "data": {} }
    ]
  }'
```

```json
{ "synced": 2, "conflicts": [] }
```

### Request fields

| Field | Required | Notes |
| --- | --- | --- |
| `mutations` | Yes | Array. Missing or non-array is `400 { "error": "mutations array required" }` |
| `deviceId` | No | Echoed into conflict records to say which device caused the clash |
| `businessId` | No | Honoured **only if you are a member**; otherwise your first membership is used |

Every mutation has the same shape:

```ts
{ table: "products" | "categories" | "sales",
  action: "upsert" | "delete",
  recordId: string,
  data: object }
```

Any other `table` is ignored. `action` is checked only for `"delete"`; every
other value, including `undefined`, takes the upsert path.

### `synced` is a counter, not a verdict

Read the loop carefully:

```js
try {
  if (table === "products")      await handleProductMutation(...);
  else if (table === "categories") await handleCategoryMutation(...);
  else if (table === "sales")    await handleSaleMutation(...);
  synced++;
} catch (err) {
  console.error(`Mutation failed for ${table}/${recordId}:`, err.message);
}
```

`synced` increments after **any** recognised table, including one whose handler
threw. A failed mutation is logged to the server console and dropped — the
client is **not** told which ones failed. A mutation for an unknown table
neither increments nor errors, so it is silently invisible.

> Treat `synced` as "this batch was accepted", not "every record was written".
> If you need per-record confirmation, re-`GET` with a cursor and diff.

### Products

Upsert branches on whether a record with that id already exists **in your
business**:

| Situation | Behaviour |
| --- | --- |
| No such product | `create` with your `recordId` as the primary key |
| Exists, `updatedAt` matches | `update` |
| Exists, `updatedAt` differs | Conflict resolution first, then update |
| `action: "delete"` | `isActive: false` — a soft delete |

Conflict resolution on a stale product uses
[`resolveConflict`](/docs/concepts/sync) from `src/lib/conflicts.ts`:

- `server-wins` — the update is **skipped entirely**, and nothing is reported to
  the client. Your change is silently lost.
- `manual-review` — a `SyncConflict` row is created with status
  `PENDING_OWNER`, pushed into the response's `conflicts` array, and the update
  is skipped.
- anything else — the update proceeds.

The fields written are a **fixed list**, not a spread:
`name`, `sku`, `buyingPrice`, `sellingPrice`, `quantity`, `lowStock`,
`isService`, `categoryId`. `imageUrl`, `thumbnailUrl` and `isActive` are **not**
synced — changing a product photo on one device will not propagate.

Deletes are scoped: `where: { id: recordId, businessId }`. Another tenant's
product id matches nothing.

### Categories

Simpler than products — **no timestamp comparison, no conflicts**:

| Action | Behaviour |
| --- | --- |
| `upsert` on an existing id | `update` with `name` and `sortOrder` |
| `upsert` on a new id | `create`, `sortOrder` defaults to `0` |
| `delete` | **Hard** delete, scoped to your business |

This is the only way to rename or reorder a category — see the limitation noted
in [Categories](/docs/api/categories).

A category delete does not touch its products. Those products are left with an
orphaned `categoryId`.

### Sales

Sales are **create-only and idempotent by id**:

```js
const existing = await prisma.sale.findFirst({ where: { id: recordId, businessId } });
if (existing) return;
```

Re-pushing a sale the server already has is a no-op, and `synced` still
increments. This is what makes safe offline retries possible — give every local
sale a stable id and you can push the same batch as many times as you like.

Unlike `POST /api/sales`, this route trusts the client's arithmetic: `total`,
`cost`, `profit`, `paid` and `change` are written exactly as sent.

The payload can be either shape:

```json
{
  "recordId": "sal_77c1",
  "table": "sales",
  "data": {
    "sale":  { "total": 640, "cost": 400, "profit": 240, "paid": 1000,
               "change": 360, "paymentMethod": "MPESA", "cashier": "Grace",
               "createdAt": "2026-09-28T16:21:09.000Z" },
    "items": [ { "id": "itm_4410", "name": "Maid stout 500ml", "quantity": 4,
                 "price": 130, "cost": 80, "productId": "prd_014" } ]
  }
}
```

`data.sale || data` — if you omit the `sale` key, the whole `data` object is
treated as the sale fields. `tax`, `taxRate` and `notes` are honoured here and
are `0`/`null` when omitted. `paymentMethod` defaults to `"CASH"`.

Item ids are yours to choose and are used verbatim as primary keys.

### Oversell becomes a conflict

For each item with a `productId` that exists in your business, stock is
checked and then decremented inside the same transaction:

```js
const check = checkStockOversell(item.productId, product.quantity + item.quantity, movements);
if (!check.ok) {
  await tx.syncConflict.create({
    data: { entityType: "product", entityId: item.productId,
            clientData: { quantity: check.finalQuantity },
            serverData: { quantity: product.quantity },
            resolution: "manual-review", status: "PENDING_OWNER", businessId },
  });
  conflicts.push(conflict);
}
await tx.product.update({ where: { id: item.productId },
                         data: { quantity: { decrement: item.quantity } } });
```

The conflict is **recorded and the decrement still happens**. The sale is not
rejected and stock is not clamped — you end up with a negative quantity plus a
`SyncConflict` row for an owner to resolve. Clients should surface the conflict
rather than retry.

An item whose `productId` points at another tenant's product, or at a deleted
one, finds no matching product and is skipped: the line is still recorded on the
sale, but no stock moves.

## Pull changes

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://aide.omixsystems.store/api/sync?since=2026-09-28T10:00:00.000Z"
```

| Parameter | Default | Notes |
| --- | --- | --- |
| `since` | `"0"` | ISO timestamp; interpreted with `new Date(since)` |
| `businessId` | — | Honoured only if you are a member |

```json
{
  "business": { "id": "bus_9d8e7f", "name": "Kijani Stores", "currency": "KES",
                "taxRate": 16, "type": "RETAIL" },
  "products":   [ /* 3 products */ ],
  "categories": [ /* 1 category  */ ],
  "sales":      [ /* 5 sales     */ ],
  "saleItems":  [ /* 11 items    */ ]
}
```

The cursor field **differs per collection**, which matters if you are filtering
on your side:

| Collection | Filtered by | Consequence |
| --- | --- | --- |
| `products` | `updatedAt > since` | Edits to old products surface; soft deletes surface |
| `categories` | `createdAt > since` | **Renamed categories are never returned** |
| `sales` | `createdAt > since` | Immutable, so this is correct |
| `saleItems` | parent sale's `createdAt > since` | Always in step with its sale |

> A category rename performed anywhere is invisible to incremental sync, because
> the category's `createdAt` never changes. The only way to pick it up is a full
> pull with `since=0`.

`saleItems` are scoped through their sale (`sale: { businessId, ... }`), so
items from other tenants are never included.

There is no `limit` on this route — a cold pull with `since=0` returns your
entire history in one response.

The response is not wrapped: `business` is the business object itself, and the
other four are bare arrays.

## Cursor discipline

Store the **server's** view of time, not your device's clock. A device whose
clock is ahead silently skips changes. A robust client sends the timestamp of
the last row it actually applied, minus a small overlap, and relies on
idempotent writes to absorb the replay.

## Status codes

| Status | Body | Cause |
| --- | --- | --- |
| `200` | `{ business, products, categories, sales, saleItems }` | Pull |
| `200` | `{ synced, conflicts }` | Push |
| `400` | `{ "error": "mutations array required" }` | Missing or non-array `mutations` |
| `401` | `{ "error": "Unauthorized" }` | No credentials, or no business membership |
| `500` | `{ "error": "<message>" }` | Unexpected failure |

## Related

- [Sync and conflict resolution](/docs/concepts/sync)
- [How Aide stores your data](/docs/concepts/offline-first)
- [Sales](/docs/api/sales)
- [Errors and status codes](/docs/api/errors)
