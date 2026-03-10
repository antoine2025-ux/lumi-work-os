import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of transactions for performance monitoring.
  tracesSampleRate: 0.1,

  // Only log Sentry internals in development.
  debug: false,

  // Drop 4xx errors — these are expected application-level responses,
  // not bugs. Only surface 5xx and unhandled promise rejections.
  beforeSend(event) {
    const status = event.contexts?.response?.status_code
    if (typeof status === 'number' && status >= 400 && status < 500) {
      return null
    }
    return event
  },
})
