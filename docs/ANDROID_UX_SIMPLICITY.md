# Aide Android UX Simplicity Plan

## Purpose

Aide should feel like a simple daily business tool, not a complicated ERP or admin dashboard. The Android application must hide technical complexity while preserving powerful capabilities underneath.

The guiding product principle is:

> Simple on the surface, sophisticated underneath.

A small-business user should be able to understand the app without knowing accounting, inventory, synchronization, databases, or software terminology.

## 1. Core navigation

Keep the primary navigation focused on four areas:

```text
HOME     SELL     STOCK     MORE
```

The home screen should expose the most important business information and quick actions. Less frequently used areas belong under More.

More should contain:

```text
Business
  My business
  Businesses

People
  Customers
  Suppliers
  Employees

Money
  Expenses
  Reports

Tools
  Notifications
  Sync
  Barcode scanner

App
  Settings
  Help
```

Do not expose 8–12 primary navigation destinations on a phone.

## 2. Dashboard philosophy

The dashboard should answer three questions immediately:

1. What is happening today?
2. What needs my attention?
3. What can I do next?

Example structure:

```text
AIDE                         bell
Good morning
Main Shop                    v

TODAY
Sales          KSh 18,450
Profit          KSh 4,820
Items sold             73

[ SELL ]       [ STOCK ]
[ MONEY ]      [ REPORTS ]

WHAT NEEDS ATTENTION
6 products are running low
2 customers have unpaid balances
Everything is synced

RECENT
Sale #1042                 KSh 850
Sale #1041                 KSh 420
Sale #1040               KSh 1,200

Home     Sell     Stock     More
```

The dashboard is not a feature catalogue. It is a business status and action screen.

## 3. Make selling the primary workflow

Selling should be the fastest and most obvious operation in Aide.

Target flow:

```text
Product -> Quantity -> Payment -> Done
```

Use a persistent, prominent Sell action. Avoid forcing users through unnecessary intermediate screens.

POS example:

```text
SELL

[ Search products... ]

Milk 500ml                 +
Bread                      +
Sugar 1kg                  +

CART
Milk x2                 130
Bread x1                  70

TOTAL                    200

[ CASH ] [ M-PESA ]

[ COMPLETE SALE ]
```

Barcode scanning should be a native Android shortcut, not a requirement for ordinary sales.

## 4. Progressive disclosure

Do not expose every available field at once.

For checkout, show the essential information first:

```text
TOTAL
KSh 850

[ CASH ]
[ M-PESA ]

[ COMPLETE SALE ]

More options
```

Advanced fields such as transaction references, discounts, customer selection, notes, or additional receipt settings should be available only when needed.

Use the same principle when adding products, customers, suppliers, and expenses.

## 5. Plain-language UX

Prefer language that matches how a small-business owner talks.

Use:

- New sale instead of Create transaction.
- Check stock instead of Inventory reconciliation.
- Customer owes instead of Accounts receivable.
- Waiting to sync instead of Synchronization queue.
- Couldn't update instead of Entity conflict.
- Couldn't sync — Retry instead of Synchronization exception.

Technical concepts may exist internally but should not leak into ordinary user-facing messages.

## 6. Smart defaults

Aide should minimize data entry by remembering safe preferences and using sensible defaults.

Examples:

- Remember the last selected business.
- Default to the user's common payment method where appropriate.
- Suggest frequently sold products.
- Remember receipt preferences.
- Calculate totals automatically.
- Surface low-stock products automatically.
- Sync automatically when connectivity returns.
- Restore locally cached data immediately.

The user should confirm useful suggestions rather than repeatedly entering the same information.

## 7. Simple screen patterns

Every major screen should follow a predictable structure.

### Inventory

```text
Inventory                         + Add
[ Search products... ]
142 products | Low stock 7

Milk 500ml
Stock 24       KSh 120        >

Bread
Stock 8        KSh 80         >

Sugar 1kg
Stock 31       KSh 160        >
```

### Customers

```text
Customers
[ Search ]

John Kamau
Owes KSh 1,200                 >

Mary Wanjiku
Paid                            >

                         + Add customer
```

### Expenses

```text
Expenses

Today
KSh 2,400

Transport                 500
Supplies                  900
Electricity             1,000

                         + Add expense
```

Use consistent search, list, detail, and primary-action patterns across the application.

## 8. Offline should feel normal

Offline mode must not feel like the application is broken.

The application should continue to work whenever the necessary local data exists.

Show a small, understandable state indicator:

```text
Online       Synced
Offline      Changes saved on this device
Pending      3 changes waiting to sync
Error        Sync failed — Retry
```

Do not expose technical queues or conflict machinery unless the user chooses to inspect Sync Centre.

A successful offline sale must remain visible and its receipt must remain available after app restart.

## 9. Sync Centre as an advanced tool

The sync system should be powerful underneath but simple by default.

```text
SYNC CENTRE

Everything synced

Last sync
Today, 10:42 AM

Pending
3 operations

Failed
0

[ SYNC NOW ]

RECENT
✓ Sale #1042 uploaded
✓ Inventory updated
✓ Customer synced
```

For errors:

```text
SYNC ISSUE

Sale #1047 couldn't sync.

Your sale is safely stored on this device.

[ RETRY ]
```

Never imply that a local transaction was lost merely because the server is unavailable.

## 10. Notifications

Notifications should be useful, actionable, and understandable.

Examples:

```text
Low stock
Milk 500ml has reached 4 units.
[View inventory]
```

```text
Sync completed
17 offline transactions were synchronized.
```

```text
Daily sales
Today's sales reached KSh 18,450.
```

Notifications should deep-link directly to the relevant native screen.

Inside Aide, provide a simple Notification Centre grouped by time and category.

## 11. Onboarding

Target onboarding time: under two minutes.

Do not create a long product tour.

Preferred flow:

```text
Welcome to Aide

Let's get your business ready.

Business name
[________________]

What do you sell?
[ Shop / Retail    v ]

[ CONTINUE ]
```

Then:

```text
You're ready.

Add your first products or start making a sale.

[ ADD PRODUCTS ]
[ START SELLING ]
```

Only request information necessary to begin.

## 12. Visual simplification

Aide should use a clean professional retail-management interface rather than a generic enterprise dashboard.

Guidelines:

- Strong visual hierarchy.
- Restrained use of cards.
- Avoid making every item a floating card.
- Use readable rows for lists.
- Use clear numeric hierarchy for money and quantities.
- Use one primary accent and semantic status indicators.
- Keep borders and shadows subtle.
- Use short, purposeful transitions.
- Avoid heavy blur, continuous animation, large decorative imagery, and GPU-heavy effects.
- Support light and dark themes.

The UI should feel native to Android while retaining Aide's own visual identity.

## 13. Accessibility

Accessibility is part of the Definition of Done.

Require:

- Accessible contrast.
- Scalable text.
- Semantic controls.
- Meaningful content descriptions.
- Comfortable touch targets, approximately 44dp or larger where practical.
- No information communicated by colour alone.
- Screen-reader-friendly labels.
- Clear focus and navigation behavior.

## 14. Low-end device design

Aide targets ordinary and potentially low-end Android devices.

Design and implementation must prioritize:

- Fast startup.
- Low memory usage.
- Minimal background work.
- Efficient lists.
- Efficient local queries.
- Small and optimized assets.
- Minimal unnecessary animation.
- Immediate display of cached data.
- Reliable operation during intermittent connectivity.

Do not trade everyday responsiveness for visual effects.

## 15. Adaptive layouts

Support small phones, normal phones, large phones, tablets, and landscape where practical.

Phones should use compact bottom navigation. Larger screens may use a navigation rail or expanded layouts.

Avoid fixed pixel-based layouts and desktop-style tables on narrow screens.

## 16. User-facing error design

Errors should tell the user what happened and what they can do next.

Bad:

```text
HTTP 503
SyncException
Network unavailable
```

Good:

```text
Couldn't sync right now.
Your changes are safe on this device.
We'll try again automatically.

[ RETRY NOW ]
```

Errors involving money or completed sales must be especially clear so that users do not accidentally repeat a transaction.

## 17. Financial workflow safety

The UI must distinguish between:

- Sale completed locally.
- Sale synchronized with server.
- Payment confirmed.
- Synchronization failed.
- Unknown payment state.

Never encourage a user to repeat a payment simply because synchronization failed.

For M-Pesa or other payment integrations, payment confirmation must be treated separately from ordinary network synchronization.

## 18. UX acceptance criteria

A feature should not be considered complete until:

- A first-time user can understand the screen without technical knowledge.
- The primary action is visually obvious.
- Common tasks require minimal taps.
- Advanced options are hidden until needed.
- Offline behavior is understandable and non-blocking.
- Errors explain the next action.
- Accessibility requirements are satisfied.
- The screen works on small Android devices.
- Loading states, empty states, success states, and error states are all designed.
- The UI does not expose internal architecture unnecessarily.

## 19. Agent rules for UX implementation

Jules must follow these rules while implementing the Android UI:

1. Do not copy the web UI literally. Preserve product concepts but redesign interaction for native Android.
2. Do not add navigation destinations without a clear user need.
3. Do not expose technical infrastructure such as databases, API terminology, or internal sync errors in normal UX.
4. Prefer one clear primary action per screen.
5. Prefer progressive disclosure over large forms.
6. Reuse the Aide design system and components rather than creating visually inconsistent screens.
7. Test important flows on a small-screen Android device or emulator.
8. Implement loading, empty, success, offline, and error states rather than only the happy path.
9. Do not add animations or visual effects that materially hurt performance.
10. Do not introduce a UI library or dependency when Compose and existing project components can solve the problem.
11. Do not redesign unrelated web/PWA screens while implementing Android UX.
12. If a proposed feature makes a common workflow harder, simplify the workflow before implementing the feature.

## 20. Core UX principle

Aide should behave like a simple mobile cash register and business notebook while providing sophisticated functionality underneath.

The user should not need to understand how Aide works internally. They should only need to understand what they want to accomplish.
