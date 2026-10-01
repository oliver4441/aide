## Create your account

Registration takes a name, an email address, a password and your business name.
Registration creates three things in a single transaction: your user account,
your first business, and your membership of it as **OWNER**.

```bash
curl -X POST https://aide.omixsystems.store/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Grace Njeri",
    "email": "grace@example.co.ke",
    "password": "a-long-passphrase",
    "businessName": "Njeri Hair Studio"
  }'
```

The response is `201 Created`:

```json
{
  "id": "usr_1a2b3c",
  "email": "grace@example.co.ke",
  "name": "Grace Njeri",
  "businessId": "bus_9d8e7f"
}
```

The password must be at least 8 characters. If an account already exists for
that email the API returns `409 Conflict` and does not reveal the existing
account beyond that.

If you leave `businessName` out, Aide uses *"{your name}'s Business"*.

### Signing in

Signing in happens in the browser through the sign-in page at
[/login](/login), or from a native client through
[POST /api/auth/mobile-login](/docs/api/authentication). Both check the same
bcrypt password hash.

> Sign in from the browser and you get a session cookie. Signing in from the
> Android or desktop client returns a bearer token. See
> [Authentication](/docs/api/authentication) for how each one is sent.

## Business defaults

A new business is created with sensible Kenyan defaults:

| Setting | Default |
| --- | --- |
| Currency | `KSh` |
| Tax rate | `16` (VAT) |
| Business type | `OTHER` |
| Your role | `OWNER` |

Business types are `SALON`, `SHOP`, `RESTAURANT`, `GROCERY`, `PHARMACY`,
`ELECTRONICS`, `CLOTHING` and `OTHER`. The type is used for sensible defaults in
the point of sale and receipt layout — it is not a hard limit on what you can
sell.

To change these later, open **Settings** in the app. To read or create a business
programmatically, see [Business](/docs/api/business).

## Create your categories

Categories group your products and set the order things appear in at the point
of sale. Create a handful before you start trading:

```bash
curl -X POST https://aide.omixsystems.store/api/categories \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "name": "Hair services", "sortOrder": 0 }'
```

`sortOrder` controls the display order; lower numbers come first.

## Add your products

Every product has a name, two prices and a quantity.

```bash
curl -X POST https://aide.omixsystems.store/api/products \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Braids - medium",
    "sku": "SVC-001",
    "buyingPrice": 0,
    "sellingPrice": 2500,
    "quantity": 0,
    "lowStock": 5,
    "isService": true,
    "categoryId": "cat_hair"
  }'
```

Three fields decide how a product behaves:

- **`buyingPrice`** — what you pay for stock. For services, set this to `0`.
- **`sellingPrice`** — what the customer pays. Profit is computed from this minus
  the cost.
- **`isService`** — set this to `true` for anything you do not hold stock of. A
  service **never decrements inventory** when it is sold.

`lowStock` is the threshold at which a product appears in low-stock alerts. It
defaults to `5` if you do not set it.

> Enter products for everything you intend to sell before opening. Adding them
> later is fine — products created offline sync normally — but the point of sale
> is faster when your catalogue is already populated.

## Check your setup

Open **Inventory** in the app and confirm your categories and products are there.
If you created them through the API they arrive on your device at the next sync,
which the app runs automatically every 30 seconds and whenever the connection
returns.

## Next

[Make your first sale](/docs/getting-started/first-sale)
