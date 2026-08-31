import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import rsc from '@vitejs/plugin-rsc'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  ssr: {
    // `pg` optionally loads `pg-native` via a guarded CommonJS require. Keep it
    // in Node's module loader so Vite does not resolve that optional package.
    external: ['pg'],
  },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//, 'pg'] } }),
    tailwindcss(),
    tanstackStart({
      rsc: {
        enabled: true
      }
    }),
    rsc(),
    viteReact(),
  ],
})

export default config
