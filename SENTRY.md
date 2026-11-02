# Sentry

Organization: `independent-dev-r0`. Project: `fort-sprite-tan`.

Browser errors initialize in `src/instrument.client.ts`, before hydration. The
router integration traces page loads and navigation. Server errors initialize in
`src/instrument.server.ts`; the server entry wraps requests, and the global request
and function middlewares capture failures. Sampling is 100% in development and 10%
in production. Events include the build mode and commit SHA as environment/release.

The public ingestion DSN lives in `src/sentry-options.ts`:

```text
https://440e27c2375af2a4d0c190fcbd6d28cb@o4512364285657088.ingest.de.sentry.io/4512364332122192
```

## Production

Create an organization auth token in
https://sentry.io/settings/independent-dev-r0/auth-tokens/ and store it as
`SENTRY_AUTH_TOKEN` in the GitHub repository's `production` environment secrets.
Do not commit or paste the token into source files. The deployment workflow checks
for it and exposes it only to the build step for Sentry uploads.

The Sentry Vite plugin uploads this build's JavaScript and source maps to the
project, including source context for readable errors, then removes the maps from
the output. Uploads require the auth token; without it, local builds still work
but do not upload maps. The workflow uses the commit SHA for both uploaded releases
and runtime events.

Deploy through the existing production workflow after reviewing these changes and
adding the secret. After deployment, verify a fresh production error has source
file, function, line, and code context. Local verification does not prove production
source-map matching.

This uses Sentry's serverless entry-import setup for Vercel. Native HTTP/fetch
tracing works; external database/library instrumentation is limited without Node
startup preloading. In particular, `pg` remains external because of its optional
native dependency. No database tracing is promised by this setup.

## Verification

A temporary development request middleware threw
`FortSprite Sentry verification 20261102`. Sentry received it as
[FORT-SPRITE-TAN-1](https://independent-dev-r0.sentry.io/issues/FORT-SPRITE-TAN-1),
with the source line and code context. The temporary trigger was removed.
