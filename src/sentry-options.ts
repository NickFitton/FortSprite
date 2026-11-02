// The DSN is a public ingestion address, not an authentication secret.
export const sentryOptions = {
  dsn: 'https://440e27c2375af2a4d0c190fcbd6d28cb@o4512364285657088.ingest.de.sentry.io/4512364332122192',
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_SENTRY_RELEASE,
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  sendDefaultPii: false,
}
