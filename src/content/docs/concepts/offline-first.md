## The core idea

Aide is **offline-first**. This is a different design from "works offline
sometimes", and the difference shows in the architecture.

In a conventional online-first app, the server is the source of truth and the
device is a thin client: every action is a request, and a failed request means a
failed action. In Aide, **the device is the source of truth for everything the
user does.** The server is the durable record and the place that reconciles
multiple devices.

The practical consequence: the point of sale never waits on a network round trip,
and never shows the customer a spinner because a tower went down.

## How a write actually happens

Every change follows the same four steps:

1. **Write locally.** The record is written to an IndexedDB database on the
   device using Dexie, and the UI updates from there.
2. **Mark it pending.** The change is added to an outbox — a `syncQueue` table
   holding the table name, the action (`create`, `update` or `delete`), the
   record id, the payload and a timestamp.
3. **Try to push.** The sync engine sends queued mutations to
   [POST /api/sync](/docs/api/sync).
4. **Clear the outbox.** On a successful push the queued item is deleted and the
   record is marked `synced`.

Steps 1 and 2 happen unconditionally and are never blocked by the network. Steps 3
and 4 are retried until they succeed.

```js
// The write path, in essence: local first, queue second, network third.
await db.products.put({ ...product, syncStatus: 'pending' });
await db.syncQueue.add({
  table: 'products',
  action: 'update',
  recordId: product.id,
  data: product,
  timestamp: new Date().toISOString(),
  deviceId: getDeviceId(),
});
```

## When sync runs

The app syncs on three triggers, none of which you have to manage:

- **Every 30 seconds** while the app is open and the device is online.
- **Immediately when connectivity returns.** The engine listens for the browser's
  `online` event and pushes right away.
- **On manual request** from the sync indicator in the app.

While offline, the app shows an explicit offline indicator. Nothing is silently
dropped — items stay in the outbox until the server confirms them.

## What this means for you

### A sale never fails because of the network

Ring up a sale in a dead spot, a basement or a lift and it still completes. The
sale is on the device the instant you tap *Complete sale*, and the stock
decrement it implies is already applied.

### Your data stays on your device

Catalogue, sales and stock live in the browser's IndexedDB until they sync. On a
shared or shop-floor device this matters: the business data is not sitting in a
localStorage key in plain text for any other app on the device to read.

### Multiple devices reconcile

Because each device writes locally, two devices can genuinely disagree. Aide
resolves that deterministically rather than by last write wins on everything —
see [Sync and conflict resolution](/docs/concepts/sync).

### Deletes are soft

Removing a product sets `isActive` to `false` rather than deleting the row. The
reason is reconciliation: if another device still has that product and re-uploads
it, Aide must not resurrect a deleted record or orphan the sales that reference
it.

## Reading data directly from the device

The same guarantee holds for reads. `GET /api/products` returns the server's
copy, but the app's inventory screen reads the local database:

```js
const products = await db.products
  .where('isActive')
  .equals(1)
  .sortBy('name');
```

That is why a product you created on your phone appears in the app instantly, and
why it still appears with the radio off tomorrow.

## Limitations worth knowing

- **Data is per device until it syncs.** Clearing browser storage on a device
  deletes its local copy. Anything not yet pushed to the server is gone with it.
- **A device id is per device.** Aide stores a generated device id in
  `localStorage` under `aide_device_id`. It is what breaks ties when two devices
  edit the same product in the same millisecond, so clearing it changes conflict
  resolution ordering.
- **Pull uses a timestamp cursor.** `GET /api/sync?since=...` returns records
  changed after that instant. A device whose clock is badly wrong may pull more
  than it needs, but will not miss changes.
