import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of transactions for performance monitoring.
  // Increase in production once baseline is established.
  tracesSampleRate: 0.1,

  // Session replay: disabled by default — PII-sensitive workspace app.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Log Sentry SDK debug messages in development only.
  debug: false,

  // Filter out expected / low-signal client errors.
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Network noise
    'Network request failed',
    'Failed to fetch',
    'NetworkError',
    // ResizeObserver benign loop errors
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
  ],
})
