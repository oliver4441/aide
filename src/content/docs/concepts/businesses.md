## Every record belongs to a business

Aide is multi-tenant. Products, categories, sales, notifications and receipts
all belong to exactly one business, and there is no global catalogue. Two salons
in Nairobi and Mombasa are two separate businesses with no shared data.

That isolation is enforced in the data layer on every read and write, not by
convention.

## Membership is the unit of access

A user gains access to a business through a **membership** row that records their
role. Membership is what every request is checked against.

```js
// src/lib/apiAuth.ts — admins get no blanket cross-tenant access.
export async function getAccessibleBusinessIds(user: SessionUser): Promise<string[]> {
  const memberships = await prisma.businessMembership.findMany({
    where: { userId: user.id },
    select: { businessId: true },
  });
  return memberships.map((m) => m.businessId);
}
```

Note what this comment guards against: a platform administrator is *not* granted
every business. An admin acts inside businesses they belong to like anyone else.

## Resolving which business to use

Most authenticated endpoints resolve a business through `requireBusiness`. The
rule is short enough to state exactly:

1. Authenticate the caller.
2. Load the businesses they are a member of.
3. If the caller passed a `businessId` **and** they are a member of it, use it.
4. Otherwise use their **first** membership.
5. If they have no membership at all, return `401 Unauthorized`.

```js
export async function requireBusiness(requestedBusinessId, request) {
  const user = await requireUser(request);
  const businessIds = await getAccessibleBusinessIds(user);

  if (businessIds.length === 0) throw new UnauthorizedError('No business membership');

  if (requestedBusinessId && businessIds.includes(requestedBusinessId)) {
    return { user, businessId: requestedBusinessId, businessIds };
  }

  return { user, businessId: businessIds[0], businessIds };
}
```

### Passing a business id you do not own

A `businessId` for a business you are not a member of is **silently ignored**, not
rejected. You get your own business's data back.

This is a deliberate choice. Echoing `403 Forbidden` would confirm that the id
you guessed belongs to somebody else, which turns the parameter into a way of
enumerating businesses. Silently falling back leaks nothing and keeps clients
simple — a client that sends a stale business id still works.

> The same reasoning applies to record ids. `GET /api/products/{id}` for a
> product in another business returns `404 Not Found`, not `403`. From the
> caller's side, a record that is not theirs and a record that does not exist are
> the same thing.

## Roles

| Role | Meaning |
| --- | --- |
| `OWNER` | Full control, including creating further staff accounts and businesses |
| `user` | Works inside the business they belong to |

A new account is created as `OWNER` of its first business. Business creation is
restricted to users who do not already own one:

```js
const existing = await prisma.businessMembership.findFirst({
  where: { userId, role: 'OWNER' },
});
if (existing) {
  return NextResponse.json({ error: 'Business already exists' }, { status: 409 });
}
```

## Platform administrators

A small set of emails, configured through the `ADMIN_EMAILS` environment
variable, authenticate against a separate `Admin` table rather than the `User`
table:

```js
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '...')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
```

Their role is `admin`, and it unlocks two things:

- `GET /api/admin/stats` — platform-wide aggregate figures
- `GET /api/reviews` and `GET /api/reviews/{id}` — reading submitted feedback

It does **not** unlock other tenants' business data. Both admin endpoints sit on
top of session checks and are unrelated to `requireBusiness`.

> If your email is in `ADMIN_EMAILS` but has no `Admin` row with a password hash,
> sign-in fails. The fallback email in the code is not a working account.

## Why scoping is repeated in each query

You will see the business scope written into the query itself, not only passed to
`requireBusiness`:

```js
const sale = await prisma.sale.findFirst({
  where: { id: params.id, businessId },
  include: { items: true, business: { select: { name: true, currency: true } } },
});
if (!sale) {
  return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
}
```

The same pattern protects stock decrements during a sale, so a sale cannot reduce
another business's inventory by referencing a foreign `productId`.

This repetition is intentional. A single missing predicate is a cross-tenant leak,
and the scope is cheapest to verify when it is visible at every query rather than
implied once at the top of a handler.

## Next

[Sync and conflict resolution](/docs/concepts/sync), or the
[Business](/docs/api/business) endpoint reference.
