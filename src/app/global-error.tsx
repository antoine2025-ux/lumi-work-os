'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
          <p className="text-slate-400 text-sm">
            An unexpected error occurred. The team has been notified.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
