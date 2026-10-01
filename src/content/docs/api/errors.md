Every Aide endpoint shares one error handler:

```ts
export function toAuthError(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  const message = err instanceof Error ? err.message : "Internal error";
  return NextResponse.json({ error: message }, { status: 500 });
}
```

So failures are always JSON with a single `error` key:

```json
{ "error": "Unauthorized" }
```

Only `UnauthorizedError` produces a `4xx`. **Anything else that throws — a
database timeout, a bug, a bad body that reaches a query — comes back as `500`
with the raw exception message in `error`.**

> Do not display `error` to end users verbatim. On a `500` it is an internal
> message that may leak schema detail. Log it, show something generic.

## Status codes

| Status | When | Body |
| --- | --- | --- |
| `200` | Success, or a suppression that is not an error | resource, or `{ skipped: true }` |
| `201` | Resource created | the created record |
| `400` | Validation failed before any query | `{ "error": "<field message>" }` |
| `401` | `UnauthorizedError` | `{ "error": "Unauthorized" }` or `{ "error": "No business membership" }` |
| `404` | Record not found **in your business**, or nothing published | `{ "error": "..." }` |
| `405` | Method not implemented on that path | Next.js default |
| `500` | Any other thrown error | `{ "error": "<raw message>" }` |

There is **no `403`** on these routes, and no `422`. A record you are not
entitled to read returns `404`, not `403` — see
[Businesses, staff and permissions](/docs/concepts/businesses).

## 400 validation messages

Validation is hand-written and per-route. These are the exact strings:

| Endpoint | Condition | Body |
| --- | --- | --- |
| `POST /api/products` | Missing or non-string `name` | `{ "error": "name required" }` |
| `POST /api/categories` | Missing or non-string `name` | `{ "error": "name required" }` |
| `POST /api/sales` | `items` missing, not an array, or empty | `{ "error": "items array required" }` |
| `POST /api/sync` | `mutations` missing or not an array | `{ "error": "mutations array required" }` |
| `POST /api/notifications` | Any of `type`, `title`, `message` missing | `{ "error": "type, title and message are required" }` |
| `PATCH /api/notifications` | `ids` missing, not an array, or empty | `{ "error": "ids array required" }` |
| `DELETE /api/notifications/{id}` | No `[id]` segment | `{ "error": "id required" }` |
| `POST /api/auth/register` | Bad name, email or password under 8 chars | `{ "error": "<message>" }` |
| `POST /api/auth/register` | Email already registered | `{ "error": "..." }` with `409` |

Note the naming: validation failures say **what is required**, not what you sent
wrong. There is no field-level detail, so a `400` tells you the rule but not the
offending value.

`POST /api/auth/register` is the one endpoint with a `409`, because it checks
for a duplicate email before the transaction. See
[Authentication](/docs/api/authentication).

## 401 and its two messages

`UnauthorizedError` carries a default message of `Unauthorized`, but one route
raises it with something more specific:

```ts
if (businessIds.length === 0) {
  throw new UnauthorizedError("No business membership");
}
```

| Message | Cause |
| --- | --- |
| `Unauthorized` | No bearer token, no session cookie, expired or invalid token |
| `No business membership` | Authenticated, but the user has no `BusinessMembership` row |

Both are `401`. The distinction matters for UX: a `No business membership` user
is signed in correctly and needs an onboarding flow, not a re-login. That is the
state a user lands in if the business record was removed from under them.

### How credentials are resolved

```ts
const token = bearerToken(request);
if (token) {
  try { return fromClaims(await verifyToken(token)); }
  catch { return null; }        // bad token → 401, session not consulted
}
const session = await getServerSession(authOptions);
```

The order is **bearer token first**. If an `Authorization: Bearer` header is
present and fails verification, the session cookie is **not** tried as a
fallback — the request is rejected. A stale token on a device that also has a
valid cookie still gets `401`. Send no header, or a current one.

Three routes bypass this entirely and use `getServerSession` directly, so they
accept **session cookies only** — a bearer token will not work on them:

- `GET /api/business`
- `GET /api/admin/stats`
- `GET /api/reviews`, and `/api/reviews/{id}`

This is worth knowing before you write a mobile client that assumes bearer auth
works everywhere.

## 404 responses

`404` means "no such record **scoped to your business**", never "this record
belongs to someone else". Both are the same response:

| Endpoint | Body |
| --- | --- |
| `GET /api/products/{id}` | `{ "error": "Product not found" }` |
| `DELETE /api/products/{id}` | same |
| `PATCH /api/products/{id}` | same |
| `GET /api/receipts/{id}` | `{ "error": "Receipt not found" }` |
| `GET /api/releases` | `{ "releases": [] }` — see below |
| `GET /api/latest-release` | `{ "version": null, "downloadUrl": null, "message": "No release available yet" }` |

The releases pair is an abuse guard rather than a not-found: when GitHub fails
or returns non-OK, the proxy returns `404` with an empty body rather than
surfacing the upstream failure. A `404` there means "no builds are published",
and the response is cacheable for five minutes.

## Soft deletes and `0` counts

Mutations that report a count can succeed with a zero:

```json
{ "updated": 0 }
{ "deleted": 0 }
```

That means the id did not match a live row **belonging to you**. It is a `200`,
not a `404`. Do not treat `0` as an error — it is the normal result of an
idempotent retry, and for another user's notification it is the only signal you
get.

## What a client should do

| Status | Action |
| --- | --- |
| `400` | Do not retry. Fix the payload — the message names the required field. |
| `401` `Unauthorized` | Token expired or absent. Re-run `/api/auth/mobile-login` and retry once. |
| `401` `No business membership` | Do not retry. Send the user through onboarding. |
| `404` | Do not retry. The record is not there, or is not yours. |
| `409` | Conflict on register. Send the user to sign in instead. |
| `500` | Retry with backoff, at most a few times. Log `error` server-side; never show it. |

Never retry a `500` in a tight loop. The common cause is a malformed body that
reached a database query, and retrying it will fail identically every time.

## Related

- [Authentication](/docs/api/authentication)
- [API introduction](/docs/api/introduction)
- [Businesses, staff and permissions](/docs/concepts/businesses)
- [Sync](/docs/api/sync) — the endpoint with the most conditional behaviour
