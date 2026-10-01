## The two halves of a sync

Sync in Aide is two independent calls against one endpoint:

- **Push** — `POST /api/sync` with the mutations waiting in the local outbox.
- **Pull** — `GET /api/sync?since=...` with the timestamp of the last successful
  pull.

A full sync cycle runs push first, then pull. Nothing blocks on the other: if the
push fails, the pull still runs, and vice versa.

## Pushing mutations

The client drains its outbox oldest-first and posts the whole batch:

```json
{
  "deviceId": "dev_1731_a7f2c9",
  "mutations": [
    {
      "table": "products",
      "action": "update",
      "recordId": "prd_5f3a",
      "data": {
        "name": "Braid - large",
        "sellingPrice": 3000,
        "quantity": 4,
        "updatedAt": "2026-09-28T08:14:22.101Z"
      }
    },
    {
      "table": "sales",
      "action": "create",
      "recordId": "sal_9c2e1",
      "data": {
        "sale": { "total": 5500, "cost": 1800, "paid": 6000, "change": 500 },
        "items": [
          { "id": "itm_1", "name": "Braid - large", "quantity": 1, "price": 3000, "productId": "prd_5f3a" },
          { "id": "itm_2", "name": "Treatment", "quantity": 1, "price": 2500, "productId": "prd_9a1" }
        ]
      }
    }
  ]
}
```

The response tells you how many mutations landed and whether any need attention:

```json
{
  "synced": 2,
  "conflicts": []
}
```

`synced` counts mutations processed. A mutation whose payload causes an error is
logged and skipped rather than failing the whole batch — one bad record does not
block the rest of your outbox.

### Three tables are accepted

Only these three `table` values are handled:

| Table | Actions | Notes |
| --- | --- | --- |
| `products` | `create`, `update`, `delete` | `delete` is a soft delete to `isActive: false` |
| `categories` | `create`, `update`, `delete` | `delete` is a hard delete |
| `sales` | `create` | Re-uploading an existing sale id is a no-op |

Anything else is ignored but still counted in `synced`.

### Sales are idempotent

A sale that already exists with that id is skipped. Because sale ids are
generated on the device, a retried push after a dropped connection cannot create a
duplicate sale — which is the single most important property here, since
double-recording a sale corrupts your takings.

## How conflicts are resolved

The interesting case is two devices editing the same product while both are
offline. Aide compares the client's `updatedAt` against the server's `updatedAt`.

```js
// src/lib/conflicts.ts
if (clientTime > serverTime) return { resolution: 'client-wins' };
if (serverTime > clientTime) return { resolution: 'server-wins' };

// Exact tie: the device id breaks it, deterministically.
if (input.clientData.deviceId > input.serverData.deviceId) {
  return { resolution: 'client-wins' };
}
return { resolution: 'server-wins' };
```

Three rules, in order:

1. **Newer `updatedAt` wins.** The normal case. Whichever device saved the edit
   most recently is authoritative.
2. **Ties break on device id.** Two devices writing in the same millisecond
   resolve the same way every time, rather than by arrival order.
3. **`server-wins` is final.** The server's row is left untouched and the client
   simply adopts it on the next pull.

Sales never conflict. They are immutable once created.

## Stock is resolved with a ledger

Stock quantities are the one place where "newest wins" is the wrong rule. Two
devices each selling the last unit is not a case where one answer is right — both
sales are real.

Aide replays the sales' movements against the quantity in timestamp order and
checks whether stock ever goes negative:

```js
// src/lib/conflicts.ts
const sorted = [...movements].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
let qty = originalQuantity;
for (const m of sorted) {
  qty += m.delta;
  if (qty < 0) return { ok: false, finalQuantity: qty, failedMovement: m };
}
return { ok: true, finalQuantity: qty };
```

If a sale would oversell, Aide still records the sale — the money is real — and
writes a `syncConflict` row with `status: PENDING_OWNER`. That conflict is
returned in the push response and stored locally on the device so you see it in
the app. It is a flag for a human to resolve, not an automatic correction.

### What manual review means

`PENDING_OWNER` conflicts are the only case where Aide stops and asks. Typical
causes:

- Two devices sold the same last unit
- An offline device re-sent a stale quantity over a newer one

Your sale history and money totals are never in question. What may need
correcting is a stock count.

## Pulling changes

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://aide.omixsystems.store/api/sync?since=2026-09-28T08:00:00.000Z"
```

Returns only what changed after the cursor:

```json
{
  "business": { "id": "bus_9d8e7f", "name": "Njeri Hair Studio" },
  "products": [],
  "categories": [],
  "sales": [],
  "saleItems": []
}
```

The cursor filters differently per collection, which is deliberate:

| Collection | Filtered on |
| --- | --- |
| `products` | `updatedAt > since` |
| `categories` | `createdAt > since` |
| `sales` | `createdAt > since` |
| `saleItems` | the parent sale's `createdAt > since` |

Categories and sales are append-and-amend rather than frequently edited, so
`createdAt` is the cheaper correct cursor for them. Products change constantly,
so they use `updatedAt`.

The client stores the pull timestamp only after a successful pull, then writes
each record into the local database with `syncStatus: 'synced'`.

## Failures and retries

- **Offline:** the engine skips the cycle entirely. Queued mutations wait.
- **Server error or dropped connection:** the queue is left untouched and the next
  cycle retries. Retries back off rather than hammering the endpoint.
- **Rejected mutation:** logged and skipped; the rest of the batch proceeds.

Because the outbox is only cleared after a successful push, an interrupted sync
resumes from the same place. Combined with idempotent sales, this means a sync can
be interrupted at any point without corrupting data.

## Next

[Businesses, staff and permissions](/docs/concepts/businesses) for how requests
are scoped, and [Sync](/docs/api/sync) for the endpoint reference.
