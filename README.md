# fortsprite

fortsprite is an Astro site for tracking Fortnite sprite collectibles and variants. It stores checklist progress in browser local storage.

## Development

```sh
npm install
npm run dev
```

The local dev server runs at `http://127.0.0.1:4321/`.

## Build

```sh
npm run build
```

Static output is generated in `dist/`.

## Deployment

The site is configured with `site: 'https://fortsprite.com'` in `astro.config.mjs`.

This repo includes a GitHub Pages workflow at `.github/workflows/deploy.yml`. In GitHub, set Pages to deploy from GitHub Actions.
