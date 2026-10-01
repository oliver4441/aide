## Open the point of sale

Tap **Point of sale** in the app. The till reads from local storage, so it opens
instantly whether or not you have a connection.

## Find what the customer wants

Search by name as you type, or browse by category. Both run against the local
database, so they work with the radio off.

Products that are services — anything with `isService` set — are listed the same
way but never reduce stock when sold.

## Build the basket

Tap a product to add it. Tap it again to increase the quantity. Adjust the
quantity or remove a line with the controls on the basket row.

The till shows you three figures as you build:

- **Total** — what the customer owes
- **Paid** — how much you have taken
- **Change** — what to give back

## Take payment

Choose the payment method — cash, card or M-Pesa — and record what the customer
handed over. Change is computed for you.

Card and M-Pesa entries record that a payment *was taken*; Aide does not integrate
with a payment processor, so settle the actual transfer in the normal way for
your provider.

## Complete the sale

Tap **Complete sale**. Aide writes the sale to the device, decrements stock for
any product that is not a service, and queues a sync job. The sale number is
generated on the device, so it succeeds with no network at all.

Once the sale is complete you are offered the receipt — print it, share it, or
skip it.

> The sale is not lost if the device dies mid-sale. It is already in the local
> queue and will be pushed on the next sync. See
> [Sync and conflict resolution](/docs/concepts/sync).

## Reprint a receipt

Every completed sale keeps its receipt. Open **Sales**, find the sale and choose
**Receipt** to view, print or share it again.

Receipts also have a permanent link of the form `/r/<sale-id>` that you can
share in a message. To fetch the data behind one, see
[Receipts](/docs/api/receipts).

## Check it landed

Two places confirm the sale is recorded:

- **Sales** shows it at the top of the list immediately.
- **Dashboard** shows today's totals, and updates on every sale.

If your device is online the sale reaches the server within about 30 seconds.
You do not need to do anything to trigger that.

## Next

- [Point of sale](/docs/guides/pos) — the full till workflow
- [Reports and analytics](/docs/guides/reports) — reading your numbers
- [Sync and conflict resolution](/docs/concepts/sync) — what happens across devices
