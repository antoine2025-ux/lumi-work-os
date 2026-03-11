import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
  replaysSessionSampleRate: 0, // Disable session replay
  replaysOnErrorSampleRate: 0.1, // 10% replay on errors
  environment: process.env.NODE_ENV,
  ignoreErrors: [
    'ResizeObserver loop', // Browser noise
    'Network request failed', // Transient network issues
    'Load failed', // Asset loading failures
  ],
})
