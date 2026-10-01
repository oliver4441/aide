## What notifications exist

Aide raises five kinds of notification:

| Type | Raised when |
| --- | --- |
| `sales` | A notable sale, such as a large one or one that needs attention |
| `inventory` | A product falls to or below its low-stock threshold |
| `customers` | Customer-related activity |
| `business` | Business-level events, such as a subscription or billing change |
| `system` | Everything else, including sync problems and anything unrecognised |

A `type` outside these five is stored as `system`, so an unexpected value never
fails the request.

## Turning alerts on and off

Each notification type has a per-user, per-business preference. Preferences default
to **enabled**, so alerts work without any setup.

When a preference is disabled, Aide does not create the notification at all:

```js
const pref = await prisma.notificationPreference.findUnique({
  where: { userId_businessId_type: { userId: user.id, businessId, type } },
});
const enabled = pref ? pref.enabled : true;
if (!enabled) {
  return NextResponse.json({ skipped: true });
}
```

The response is `{ "skipped": true }` with status `200`. A client must not treat
this as an error — it means the alert was suppressed on purpose.

Change preferences in **Settings → Notifications** in the app.

## Where notifications come from

There are two channels, and they are kept distinct on purpose.

- **`server`** — created by Aide itself. Low stock and system events.
- **local** — raised on the device and reconciled later.

Only `server` notifications are returned by the sync endpoint, because local ones
are already on the device that raised them:

```js
const where = { userId: user.id, businessId, channel: 'server', deletedAt: null };
```

## Notifications are per user

A notification belongs to the user who received it and to one business. Listing
notifications requires a session, and returns that user's own alerts only — there
is no endpoint that returns another user's notifications.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://aide.omixsystems.store/api/notifications
```

```json
{
  "notifications": [
    {
      "id": "ntf_4a1",
      "type": "inventory",
      "title": "Low stock: Maid stout 500ml",
      "message": "4 units left, reorder point is 6.",
      "read": false,
      "data": { "productId": "prd_014", "quantity": 4, "lowStock": 6 },
      "createdAt": "2026-09-28T11:03:02.000Z"
    }
  ]
}
```

The most recent 100 are returned. Pass `since` to narrow to what is new:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://aide.omixsystems.store/api/notifications?since=2026-09-28T00:00:00.000Z"
```

## Marking as read

```bash
curl -X PATCH https://aide.omixsystems.store/api/notifications \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "ids": ["ntf_4a1", "ntf_4a2"] }'
```

```json
{ "updated": 2 }
```

`ids` is required and must be a non-empty array. `updated` is the number actually
changed, which is `0` for ids that are already read or not yours.

## Dismissing a notification

Deleting a notification is soft — it sets `deletedAt` rather than removing the
row, so a later sync cannot resurrect a notification you dismissed:

```bash
curl -X DELETE https://aide.omixsystems.store/api/notifications/ntf_4a1 \
  -H "Authorization: Bearer $TOKEN"
```

```json
{ "deleted": 1 }
```

Dismissed notifications are excluded from all listings.

## Reading and dismissals across devices

Reading or dismissing on one device should show up on your others. That is what
the sync endpoint is for — it persists your local state on the server, then
returns what the device has not seen:

```bash
curl -X POST https://aide.omixsystems.store/api/notifications/sync \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "readIds": ["ntf_4a1"],
    "deletedIds": ["ntf_4a2"],
    "since": "2026-09-28T06:00:00.000Z"
  }'
```

```json
{
  "notifications": [ /* server notifications newer than `since` */ ],
  "serverNow": "2026-09-28T11:20:44.512Z"
}
```

The order matters. Aide **writes your read and dismissed state first**, then
returns notifications. Without that ordering, a read performed on one device
could be lost by a pull from another immediately after.

`serverNow` is the server's current time, which the app uses to advance its cursor
to a value the server actually produced rather than trusting the device clock.

All three fields are optional; send what you have.

## Practical advice

- Enable `inventory` and `sales`. Leave `system` on so you see sync problems.
- Low-stock alerts depend on your `lowStock` thresholds being realistic. See
  [Products and categories](/docs/guides/products).
- Grant notification permission when the app asks. Without it, alerts are recorded
  and visible in-app but the device will not surface them.
