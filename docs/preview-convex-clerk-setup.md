# Preview checklist backend setup

This runbook records the working Preview configuration for the signed-in FortSprite checklist. It deliberately omits credentials and deploy keys.

## What is connected

| Part | Preview / development value |
| --- | --- |
| Vercel branch | `feat/signed-in-convex-checklist` |
| Convex development deployment | `efficient-orca-334` |
| Convex URL | `https://efficient-orca-334.eu-west-1.convex.cloud` |
| Clerk development Frontend API | `https://verified-cattle-38.clerk.accounts.dev` |
| Clerk JWT template | `convex` with `{ "aud": "convex" }` |

The critical rule is that all three values must describe the **same Clerk instance**:

1. The Preview Clerk publishable and secret keys.
2. Convex development's `CLERK_JWT_ISSUER_DOMAIN`.
3. The Clerk instance holding the `convex` JWT template.

If any one is from a different Clerk instance, users can sign in to Clerk but Convex will remain unauthenticated and no checklist rows will be written.

## Application configuration

`convex/auth.config.ts` configures Clerk as Convex's provider:

```ts
export default {
  providers: [{
    domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
    applicationID: 'convex'
  }]
};
```

The browser client in `src/lib/account-checklist.ts` must request the matching Clerk template:

```ts
client.setAuth(
  async () => session?.getToken({ template: 'convex' }) ?? null,
  onAuthenticationChanged
);
```

Using `session.getToken()` with no template is not sufficient for this integration: the token must include the `aud: "convex"` claim.

## Clerk setup

In the Clerk **development instance** used by Preview:

1. Create a JWT template named `convex`.
2. Give it this claims JSON:

   ```json
   { "aud": "convex" }
   ```

3. Keep Clerk's default signing key enabled. No custom signing key is needed.
4. Use that instance's development publishable key (`pk_test_...`) and secret key for the Vercel Preview environment.

The template can be inspected with:

```sh
clerk api /jwt_templates
```

The CLI must be logged in and linked to the intended Clerk application first.

## Convex development setup

Set the issuer on the development deployment to Clerk development's **Frontend API URL**, not the app URL and not a different Clerk custom domain:

```sh
npx convex env set \
  CLERK_JWT_ISSUER_DOMAIN \
  https://verified-cattle-38.clerk.accounts.dev \
  --deployment efficient-orca-334
```

Then resync the functions and auth configuration:

```sh
npx convex dev --once --env-file .env.local
```

The deployment should report `efficient-orca-334` and the URL above. Do not put any Clerk secret in Convex environment variables for this integration; Convex validates Clerk tokens using the issuer's public keys.

## Vercel Preview setup

Create branch-specific Preview variables for `feat/signed-in-convex-checklist`:

| Variable | Value / handling |
| --- | --- |
| `PUBLIC_CONVEX_URL` | `https://efficient-orca-334.eu-west-1.convex.cloud` |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | The development instance's `pk_test_...` key; store as non-sensitive because it is sent to browsers. |
| `CLERK_SECRET_KEY` | The matching development instance secret; store as sensitive. |

After changing any Vercel environment variable, redeploy the Preview. Pushing a commit to the branch also starts a new Preview deployment.

### Important Vercel CLI limitation

`vercel env pull` redacts sensitive values as the literal `[SENSITIVE]`. Never use a pulled sensitive value to populate another environment: doing so deploys the placeholder rather than the secret. Pull fresh Clerk values with `clerk env pull` (to a temporary file) when a secret must be copied.

## Testing the working path

The account checklist starts only when the browser has no anonymous checklist entries.

1. Use a fresh browser profile or clear this origin's local storage.
2. Open the branch Preview and sign in.
3. Wait for the account connection to settle, then change one sprite status.
4. Open the `accountChecklists` table for `efficient-orca-334` in the Convex dashboard.
5. Expect one row containing sparse `progress`, `revision`, and `updatedAt` fields.

Useful checks:

```sh
# Confirm the table has data.
npx convex data accountChecklists --deployment efficient-orca-334 --limit 20

# Inspect recent development-function activity while debugging.
npx convex logs --deployment efficient-orca-334 --history 50 --success
```

## Anonymous-progress behavior

Anonymous progress intentionally remains in browser local storage:

- Current key: `fortsprite:anonymous:v1`
- Legacy key: `fortsprite:v1`

When that local progress is non-empty, the page deliberately does **not** start the account checklist. This avoids silently overwriting or attributing anonymous progress. Reconciling or importing that data after sign-in is separate work; it is not a sign-in/Convex failure.

## Production checklist

Production must be configured separately. Never reuse Preview's Clerk development keys or issuer.

Before enabling the signed-in checklist in Production:

1. Use the Clerk production instance's Frontend API URL as the production Convex deployment's `CLERK_JWT_ISSUER_DOMAIN`.
2. Create/activate the `convex` JWT template with `aud: "convex"` in that production Clerk instance.
3. Set Vercel Production's `PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the same production Clerk instance.
4. Set Production's `PUBLIC_CONVEX_URL` to the production Convex URL, or use the configured production Convex deploy command to inject it.
5. Deploy Convex production and then redeploy Vercel Production.
6. Test with a new browser profile and a non-production test account before relying on real user data.

The existing production Convex deployment is `canny-firefly-580`, but its Clerk issuer/template pairing must be verified before this feature is promoted from Preview.
