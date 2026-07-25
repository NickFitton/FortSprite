# fortsprite

fortsprite is an Astro site for tracking Fortnite sprite collectibles and variants. Anonymous checklist progress stays in browser local storage; signed-in progress is stored in Convex.

## Development

```sh
npm install
npm run dev
```

The local dev server runs at `http://127.0.0.1:4321/`.

## Signed-in checklist

Configure Clerk's Convex integration, then set `CLERK_JWT_ISSUER_DOMAIN` to the Clerk Frontend API URL it provides. Convex reads this environment variable when deploying `convex/auth.config.ts` to verify Clerk session tokens.

Set `PUBLIC_CONVEX_URL` to the Convex deployment URL in the Astro environment. For local work, `npx convex dev` writes `CONVEX_URL` to `.env.local`; copy that value into `PUBLIC_CONVEX_URL` before starting the Astro server. See `.env.example` for the expected variables.

## Build

```sh
npm run build
```

Static output is generated in `dist/`.

## Deployment

The site is configured with `site: 'https://fortsprite.app'` in `astro.config.mjs`.

This repo includes a GitHub Pages workflow at `.github/workflows/deploy.yml`. In GitHub, set Pages to deploy from GitHub Actions.
