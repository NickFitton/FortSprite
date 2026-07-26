import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  // The unconfigured Clerk development integration uses keyless bootstrap,
  // which rate-limits parallel browser workers. One worker keeps browser
  // verification deterministic without weakening the production flow.
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4321'
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: !process.env.CI
  }
});
