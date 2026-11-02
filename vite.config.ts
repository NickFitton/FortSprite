import { defineConfig } from 'vite'
import { sentryTanstackStart } from '@sentry/tanstackstart-react/vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import rsc from '@vitejs/plugin-rsc'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  define: {
    'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'local'),
  },
  resolve: { tsconfigPaths: true },
  ssr: {
    // `pg` optionally loads `pg-native` via a guarded CommonJS require. Keep it
    // in Node's module loader so Vite does not resolve that optional package.
    external: ['pg'],
  },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart({
      rsc: {
        enabled: true
      }
    }),
    rsc(),
    viteReact(),
    sentryTanstackStart({
      org: 'independent-dev-r0',
      project: 'fort-sprite-tan',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
      sourcemaps: {
        filesToDeleteAfterUpload: ['.output/**/*.map', '.vercel/output/**/*.map', 'dist/**/*.map'],
      },
    }),
  ],
})

export default config
