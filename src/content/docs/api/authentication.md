## Two ways to authenticate

Aide accepts two credential types on the business endpoints:

1. **A NextAuth session cookie** — what the browser and the web app use.
2. **A bearer token** — what the Android and desktop clients use, because they
   cannot complete a browser sign-in flow.

Both resolve to the same identity:

```js
// src/lib/apiAuth.ts
export async function resolveUser(request?: NextRequest): Promise<SessionUser | null> {
  const token = bearerToken(request);
  if (token) {
    try {
      const claims = await verifyToken(token);
      return { id: claims.sub, email: claims.email, name: claims.name,
               role: claims.role, businessId: claims.businessId };
    } catch {
      return null;
    }
  }

  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!session || !user?.id) return null;
  return user;
}
```

A bearer token takes precedence when both are present.

## Signing in from the app

### In the browser

Go to [/login](/login) and sign in with email and password. Aide sets a JWT
session cookie valid for 30 days. Browser clients need nothing further — requests
carry the cookie automatically.

### From a native client

Native clients cannot complete the browser flow, so they exchange credentials for
a token:

```bash
curl -X POST https://aide.omixsystems.store/api/auth/mobile-login \
  -H 'Content-Type: application/json' \
  -d '{ "email": "grace@example.co.ke", "password": "a-long-passphrase" }'
```

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_1a2b3c",
    "email": "grace@example.co.ke",
    "name": "Grace Njeri",
    "role": "user",
    "businessId": "bus_9d8e7f"
  }
}
```

Store the token and send it on every request:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://aide.omixsystems.store/api/dashboard
```

Bad credentials return `401`:

```json
{ "error": "Invalid email or password" }
```

> The message is deliberately identical whether the account does not exist or the
> password is wrong, and a dummy bcrypt comparison is run in the missing-account
> case so the two take comparable time. Do not try to distinguish them.

## What is in the token

The token is a JWT signed with HS256 using the server's `NEXTAUTH_SECRET`.

| Claim | Meaning |
| --- | --- |
| `sub` | User id — the token subject |
| `email` | Email address |
| `name` | Display name |
| `role` | `admin` or `user` |
| `businessId` | First business membership, or `null` |
| `iss` | Always `aide` |
| `aud` | Always `aide-mobile` |
| `exp` | 30 days after issue |

The lifetime matches the browser session's 30-day `maxAge`, so a user is not
forced to sign in again more often on mobile than on the web.

Issuer and audience are verified on every use:

```js
const { payload } = await jwtVerify(token, secretKey(), {
  issuer: 'aide',
  audience: 'aide-mobile',
});
```

A token that fails verification is treated as no credentials at all, giving
`401` rather than a more specific error.

## Which identity is checked

Sign-in does one bcrypt comparison against exactly one table:

```js
const isAdmin = ADMIN_EMAILS.includes(email);

if (isAdmin) {
  const admin = await prisma.admin.findUnique({ where: { email } });
  // compares against Admin.passwordHash, role: 'admin'
}

const user = await prisma.user.findUnique({ where: { email } });
// compares against User.passwordHash, role: 'user'
```

Emails listed in the `ADMIN_EMAILS` environment variable are checked against
`Admin`; everyone else against `User`. A single password check per attempt.

> If you have an admin email but no `Admin` row with a password hash, sign-in
> fails. Being in the environment variable is not sufficient.

## Registration

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

| Field | Required | Notes |
| --- | --- | --- |
| `name` | Yes | Trimmed. Must not be empty. |
| `email` | Yes | Trimmed and lowercased. Format validated. |
| `password` | Yes | Minimum 8 characters. Hashed with bcrypt, cost 12. |
| `businessName` | No | Defaults to `"{name}'s Business"` |

Returns `201` with the user id, email, name and the new `businessId`. The user,
their first business and their `OWNER` membership are created in one
transaction, so an account can never exist without a business attached.

Possible failures:

| Status | Body | Cause |
| --- | --- | --- |
| `400` | `{ "error": "Name is required" }` | Missing name |
| `400` | `{ "error": "Enter a valid email address" }` | Malformed email |
| `400` | `{ "error": "Password must be at least 8 characters" }` | Too short |
| `400` | `{ "error": "Invalid request body" }` | Body is not valid JSON |
| `409` | `{ "error": "An account with that email already exists" }` | Email taken |

Registration does **not** sign you in. Call
[`mobile-login`](#from-a-native-client) with the same credentials to get a token.

## Admin-only endpoints

`GET /api/admin/stats`, `GET /api/reviews` and `GET /api/reviews/{id}` check for
a session whose role is `admin` and return `403 Forbidden` otherwise.

These endpoints read the session directly, so a **bearer token alone is not
enough**. An admin client must hold a browser session.

> An `admin` role does not widen business-data access. Platform statistics are
> the only extra capability — see
> [Businesses, staff and permissions](/docs/concepts/businesses).

## Handling expiry

A `401` means one of:

- No `Authorization` header and no session cookie
- The token is malformed, expired, or signed with a different secret
- The session has aged past 30 days
- The account exists but has **no business membership** — the message is
  `No business membership`

The first four all mean "sign in again". The last is different: it means an
authenticated user with no business attached, which requires onboarding rather
than re-authentication.

## Security notes

- Tokens are bearer credentials. Treat one as a password: never log it, never put
  it in a URL, and use HTTPS.
- There is no token revocation endpoint. To force a sign-out, rotate
  `NEXTAUTH_SECRET` — which invalidates **all** sessions and tokens at once.
- Passwords are bcrypt with cost 12. Aide never stores or returns a password hash
  through the API.
