## List notifications

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://aide.omixsystems.store/api/notifications?since=2026-09-28T00:00:00.000Z"
```

| Parameter | Effect |
| --- | --- |
| `since` | Only notifications created after this ISO timestamp |
| `businessId` | Honoured only if you are a member |

Returns `{ notifications }`, newest first, capped at **100** rows. There is no
`limit` parameter — the cap is fixed in the query.

```json
{
  "notifications": [
    {
      "id": "ntf_2f81",
      "userId": "usr_4c17",
      "businessId": "bus_9d8e7f",
      "type": "inventory",
      "channel": "server",
      "title": "Low stock: Sugar 1kg",
      "message": "4 units left, threshold is 6.",
      "data": { "productId": "prd_088" },
      "read": false,
      "createdAt": "2026-09-28T15:04:22.000Z",
      "deletedAt": null
    }
  ]
}
```

Two filters are always applied and are not optional: `userId` is **the
authenticated user**, and `deletedAt: null`. Notifications belong to a person,
not to a business — a colleague's alerts are never visible to you even though
you share a business.

> The 100-row cap combined with newest-first ordering means a device that has
> been offline for a while can fall off the end. Poll with a `since` cursor
> rather than fetching the full list repeatedly.

## Create a notification

```bash
curl -X POST https://aide.omixsystems.store/api/notifications \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "inventory",
    "title": "Low stock: Sugar 1kg",
    "message": "4 units left, threshold is 6.",
    "data": { "productId": "prd_088" }
  }'
```

`type`, `title` and `message` are all required. Missing any of them:

```json
{ "error": "type, title and message are required" }
```

with status `400`.

### Types are coerced, not rejected

The five accepted types are:

```js
const CATEGORIES = ["sales", "inventory", "customers", "system", "business"];
```

An unrecognised type is **silently rewritten** to `system`, and the
`NotificationPreference` lookup then uses the original string from the request —
which will not match any stored row:

```js
type: CATEGORIES.includes(type) ? type : "system",
```

```js
const pref = await prisma.notificationPreference.findUnique({
  where: { userId_businessId_type: { userId: user.id, businessId, type } },
});
const enabled = pref ? pref.enabled : true;
```

So a typo'd type is created as a `system` notification but checks the
preference for the typo'd name, finds nothing, and falls through to the default
of enabled. Fix the type strings.

### Preferences can suppress creation

If the caller has a `NotificationPreference` row for this
`(userId, businessId, type)` with `enabled: false`, nothing is written:

```json
{ "skipped": true }
```

Note this is a `200`, not a `204` or a `4xx`. **A `200` response does not mean
a notification was created** — check for the presence of the `notification` key.

Otherwise:

```json
{ "notification": { "id": "ntf_2f81", "channel": "server", "..." : "" } }
```

`channel` is always `"server"` here. Notifications born on the device carry a
different channel; see [the sync route](#reconcile-state) below.

## Mark as read

```bash
curl -X PATCH https://aide.omixsystems.store/api/notifications \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "ids": ["ntf_2f81", "ntf_2f80"] }'
```

```json
{ "updated": 2 }
```

`ids` must be a non-empty array, otherwise `400 { "error": "ids array required" }`.
The update is scoped to `userId` and `businessId`, and skips anything already
soft-deleted. `updated` is the number of rows that actually matched, so marking
the same id twice returns `{"updated": 0}` the second time — the update is
idempotent but not idempotent-*counting*.

There is no "mark all as read" route. Send the ids.

## Delete a notification

```bash
curl -X DELETE https://aide.omixsystems.store/api/notifications/ntf_2f81 \
  -H "Authorization: Bearer $TOKEN"
```

```json
{ "deleted": 1 }
```

Deletion is **soft** — `deletedAt` is stamped, the row remains. `{ "deleted": 0 }`
is a `200`, not a `404`: another user's notification, one from another business,
and one already deleted are indistinguishable. See
[Businesses, staff and permissions](/docs/concepts/businesses).

The `[id]` segment is read defensively; if it is missing the route returns
`400 { "error": "id required" }`.

## Reconcile state

`POST /api/notifications/sync` is the bidirectional endpoint a device uses when
it reconnects.

```bash
curl -X POST https://aide.omixsystems.store/api/notifications/sync \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "readIds": ["ntf_2f81"],
    "deletedIds": ["ntf_2f70"],
    "since": "2026-09-28T12:00:00.000Z",
    "businessId": "bus_9d8e7f"
  }'
```

| Field | Effect |
| --- | --- |
| `readIds` | Stamped read server-side, so the read propagates to every device |
| `deletedIds` | Soft-deleted server-side |
| `since` | Only return notifications created after this timestamp |
| `businessId` | Honoured only if you are a member |

All fields are optional; the route validates none of them and does not reject
bad shapes.

```json
{
  "notifications": [ /* only channel: "server", deletedAt: null, capped at 100 */ ],
  "serverNow": "2026-09-28T16:21:09.412Z"
}
```

Two things to note:

- **Writes happen first, reads second.** A batch is applied and only then
  queried, so an id in both `readIds` and `deletedIds` ends up deleted, not read.
- **`channel: "server"` only.** Device-born notifications are filtered out —
  `where: { channel: "server" }`. Without this a device would receive back the
  items it just uploaded.

`serverNow` is the server's clock at response time. Use it, not the device's, to
set the next `since` cursor — a device with a fast clock would otherwise skip
notifications created in the gap.

## Status codes

| Status | Body | Cause |
| --- | --- | --- |
| `200` | `{ notifications }` | List |
| `200` | `{ notification }` or `{ skipped: true }` | Create, or suppressed by preference |
| `200` | `{ updated }` / `{ deleted }` | Mutation applied |
| `200` | `{ notifications, serverNow }` | Reconcile |
| `400` | `{ "error": "type, title and message are required" }` | Incomplete create |
| `400` | `{ "error": "ids array required" }` | Empty or non-array `ids` |
| `400` | `{ "error": "id required" }` | Missing `[id]` |
| `401` | `{ "error": "Unauthorized" }` | No credentials, or no business membership |

## Related

- [Notifications](/docs/guides/notifications) — choosing what you receive
- [Sync](/docs/api/sync) — for products, categories and sales
- [Errors and status codes](/docs/api/errors)
