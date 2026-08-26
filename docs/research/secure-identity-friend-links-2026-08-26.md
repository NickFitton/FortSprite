# Secure identity and authorization seam for raw-ID friend links

**Question.** What secure, supportable design resolves the raw Clerk user ID in
a FortSprite friend link to a confirmation identity? How must request,
friendship, and friend-collection reads be authorized? Which identity fields
may be displayed, where may they be retrieved, and what current Clerk and
Convex constraints apply?

**Scope.** This planning note uses official Clerk and Convex documentation,
checked on 2026-08-26. It does not implement the Friends area.

## Recommendation

Treat the raw `user_…` value in a friend link as an **untrusted lookup key**,
not as an authenticated identity or a permission. A signed-out visitor can open
the link route, but must see only a sign-in call to action. Resolve the target
to a confirmation profile only after the caller has signed in.

Use the existing Astro SSR server as the narrow synchronous Clerk boundary:
an authenticated endpoint checks `Astro.locals.auth()`, rejects self-links,
then calls Clerk's server-side `clerkClient(context).users.getUser(targetId)`.
It returns a deliberately small profile projection, never the Clerk `User`
object. Do not put a Clerk secret in the browser.

For the live Friends area, persist a minimal `friendProfile` projection in
Convex, keyed by the raw Clerk user ID, from verified Clerk `user.created`,
`user.updated`, and `user.deleted` webhooks. Read that projection only after
the relevant relationship authorization succeeds. This is the documented
social-feature use case for synchronizing user data: it avoids a Clerk backend
lookup for each incoming/outgoing/accepted-friend read. The profile copy is
eventually consistent, so the synchronous confirmation endpoint remains the
source for the first confirmation screen.

## Identity model

Convex guarantees `identity.subject`, `identity.issuer`, and
`identity.tokenIdentifier` after `ctx.auth.getUserIdentity()`. With Clerk,
`subject` is the provider's user identifier, so use it as the raw Clerk ID in
the friend-link and friend-profile contracts. `tokenIdentifier` combines the
subject and issuer and remains appropriate for the existing account-checklist
ownership model; if FortSprite later accepts multiple issuers, the social
model must either migrate to `tokenIdentifier` or make the issuer an explicit
part of the link contract.

Never take the initiating user ID from a browser argument. Each public social
function derives it from `ctx.auth.getUserIdentity().subject`; a target raw ID
is merely data to validate and compare. The current checklist uses
`tokenIdentifier`, so the implementation must make this deliberate identity
translation rather than accidentally joining a raw ID to a token identifier.

- [Convex: Auth in Functions](https://docs.convex.dev/auth/functions-auth)
- [Convex: Storing Users in the Convex Database](https://docs.convex.dev/auth/database-auth)

## Confirmation identity and display fields

Clerk's backend `User` object has the target's ID, username, first and last
name, image URL, and contact information. It is backend-only and includes
private metadata, email addresses, phone numbers, external accounts, and other
data that FortSprite must not return as a confirmation response.

The first release should return and synchronize only:

```ts
type FriendProfile = {
  clerkUserId: string;
  username: string | null;
  imageUrl: string | null;
};
```

Render `username` when it exists, otherwise a neutral fallback such as
`"FortSprite player"`. A profile image may accompany it. First name, last
name, full name, email address, phone number, metadata, account/security
fields, and the raw ID itself are technically available to trusted backend
code, but are not needed for the Friends experience and should not be exposed.
If a future product decision needs a real-name display, add an explicit
profile/discoverability policy first rather than expanding this response by
default.

- [Clerk: Backend User type](https://clerk.com/docs/reference/backend/types/backend-user)
- [Clerk: `getUser()`](https://clerk.com/docs/reference/backend/user/get-user)
- [Clerk: Astro locals](https://clerk.com/docs/reference/astro/locals)

## Authorized boundaries

| Operation | Required authorization and boundary |
| --- | --- |
| Open a raw-ID link while signed out | Route parsing only; do not look up or return target identity. |
| Resolve the confirmation profile | An Astro server endpoint first requires `locals.auth().isAuthenticated`, derives the requester from the session, rejects self, fetches the target through the Clerk backend client, and returns only `FriendProfile`. Return an indistinguishable not-found result for absent, malformed, or unavailable targets. |
| Send a request | An authenticated public Convex function derives the sender from `identity.subject`, validates the target and self-link rule, and creates no read permission merely by creating the request. The lifecycle ticket supplies the state and idempotency rules. |
| Read incoming or outgoing requests | An authenticated public Convex query filters by the caller's derived identity. It returns only relationship records involving that caller and their permitted `FriendProfile` projections. |
| Accept, decline, or remove | An authenticated public Convex mutation derives the caller and verifies that the caller is a participant in the exact relationship before changing it. |
| Read a friend's collection | An authenticated public Convex query derives the viewer, verifies an accepted relationship between viewer and requested owner in either direction, then reads the owner's **signed-in** Chapter Season progress. It must not expose progress from anonymous browser storage, and it must not offer a public `getCollection(ownerId)` query. |

The Astro page guard is useful user-interface protection, but every public
Convex query, mutation, and action is directly callable by a client and must
repeat its own authentication and relationship checks. Use internal Convex
functions for database helpers that must not be invoked by a client.

- [Clerk: Astro backend client](https://clerk.com/docs/reference/astro/overview)
- [Convex: Internal Functions](https://docs.convex.dev/functions/internal-functions)
- [Convex: database authorization](https://docs.convex.dev/auth/database-auth)

## Clerk profile synchronization

Clerk identifies social features—where users see other users' names or
avatars—as a case where a local, synchronized user projection is appropriate.
Its guidance calls out `user.created`, `user.updated`, and `user.deleted` for
maintaining that data. Verify every webhook with Clerk's `verifyWebhook`
helper, update only the three approved fields, and make the operation
idempotent because webhooks can retry. A deleted Clerk user should make the
profile unavailable and prevent further identity display or collection access;
the relationship-lifecycle decision will determine whether the associated
relationship records are removed or retained as unavailable history.

Webhook delivery is asynchronous and can fail or be delayed. Do not make the
first confirmation, request sending, or acceptance depend on a profile-sync
event already having arrived. The direct, authenticated `getUser(targetId)`
confirmation check handles the initial target-exists decision; the synchronized
projection serves ordinary read paths afterwards.

- [Clerk: Sync Clerk data with webhooks](https://clerk.com/docs/guides/development/webhooks/syncing)
- [Clerk: Webhook signature verification](https://clerk.com/docs/guides/development/webhooks/overview)

## Convex and Clerk API constraints

- Convex queries and mutations must be deterministic and cannot call a
  third-party API. A Convex action can use `fetch` and invoke database work
  through `ctx.runQuery` and `ctx.runMutation`; an internal action is not
  client-callable. Thus, if FortSprite later moves the synchronous Clerk lookup
  out of Astro, it must use an authenticated Convex action (normally with a
  Clerk secret stored only in Convex environment configuration), not a query or
  mutation. The current Astro boundary avoids adding that second secret-bearing
  integration for this narrow lookup.
- Clerk's Backend API is rate limited per instance: the documented broad limit
  is 100 requests per 10 seconds in development and 1,000 per 10 seconds in
  production. Back off on `429` and honor `Retry-After`. Add application-level
  rate limiting to the authenticated confirmation endpoint: the raw ID is
  shareable and therefore should not become a cheap user-enumeration surface.
- Clerk warns that server-side user retrieval is slower and rate limited. That
  supports the webhook-synchronized read model, rather than doing BAPI lookups
  inside friend-list or live collection reads.
- Do not base authorization on Clerk `unsafeMetadata`: frontend code can write
  it. The Friends model needs no metadata-based authorization; relationship
  records in Convex are the authority for friend-only reads.

- [Convex: Queries](https://docs.convex.dev/functions/query-functions)
- [Convex: Mutations](https://docs.convex.dev/functions/mutation-functions)
- [Convex: Actions](https://docs.convex.dev/functions/actions)
- [Clerk: rate limits](https://clerk.com/docs/guides/how-clerk-works/system-limits)
- [Clerk: user metadata](https://clerk.com/docs/guides/users/extending)

## Resolution

The implementation-ready seam is: authenticated Astro + Clerk Backend API for
one confirmation lookup; signed-in identity derived in every Convex social
operation; Convex relationship authorization before every social or
friend-collection read; and a verified-webhook-synchronized, minimal profile
projection for ordinary live Friends screens. The next decision should specify
the relationship record and state-transition invariants, including the
profile-unavailable and stale-action cases.
