## What Aide is

Aide is an offline-first point of sale, inventory and reporting app for small
businesses. It runs on Android, Windows and the browser, and it is built around
one assumption: **your connection will drop, and your business must not stop.**

That assumption shapes everything. Every sale you ring up is written to the
device first and synced to the server afterwards, so a busy Saturday with patchy
mobile data does not cost you a day's takings.

> New here? Start with the [New user guide](/docs/getting-started/new-user-guide)
> for a day-one walkthrough, or go straight to
> [Set up your business](/docs/getting-started/setup).

## How Aide is put together

Aide has three layers, and the documentation is organised around them.

### The app

The customer-facing application: the point of sale, inventory, reports,
receipts and settings. It runs on Android, Windows and as a progressive web app.
The [Installation](/docs/getting-started/installation) page covers getting it
onto a device.

### Local storage

Before anything touches the network, it lands in a local IndexedDB database on
the device. The app reads and writes there continuously, which is why the point
of sale is instant and works with the radio off.
[How Aide stores your data](/docs/concepts/offline-first) explains this in full.

### The API

A small JSON API that stores authoritative records, authenticates users and
supports the sync protocol. You can read every endpoint in the
[API reference](/docs/api/introduction).

## Where to go next

### I want to start using Aide

1. [Install the app](/docs/getting-started/installation) on your phone or computer
2. [Set up your business](/docs/getting-started/setup) — categories and products
3. [Make your first sale](/docs/getting-started/first-sale) and print a receipt

### I want to understand how it works

- [How Aide stores your data](/docs/concepts/offline-first) — the offline-first model
- [Sync and conflict resolution](/docs/concepts/sync) — what happens when two devices disagree
- [Businesses, staff and permissions](/docs/concepts/businesses) — tenant isolation

### I want to run the day-to-day business

- [Products and categories](/docs/guides/products)
- [Point of sale](/docs/guides/pos)
- [Reports and analytics](/docs/guides/reports)
- [Notifications](/docs/guides/notifications)

### I want to integrate with Aide

- [API introduction](/docs/api/introduction) — base URL and conventions
- [Authentication](/docs/api/authentication) — sessions and bearer tokens
- [Sync](/docs/api/sync) — the endpoint the offline clients use

## A note on this documentation

Every API page in these docs describes the routes that exist in this codebase,
including their exact status codes and error shapes. Where a limit or behaviour
is enforced, it is documented rather than assumed. If you find something
incorrect, [email us](/docs/reference/changelog) and we will correct the page.
