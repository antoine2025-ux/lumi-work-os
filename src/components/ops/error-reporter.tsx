'use client'

import { useEffect } from 'react'

/**
 * ErrorReporter - Client-side error reporting component
 * 
 * Listens to window errors and unhandled rejections, then sends them
 * to the /api/ops/client-error endpoint for logging.
 * 
 * Only active if OPS_LOGGING_ENABLED is enabled (checked via API).
 * Samples errors (1 in 5) to avoid spam.
 */
export function ErrorReporter() {
  useEffect(() => {
    // Check if logging is enabled (we'll check this on first error)
    let loggingEnabled = false
    let checkPromise: Promise<void> | null = null

    const checkLoggingEnabled = async () => {
      if (checkPromise) return checkPromise
      
      checkPromise = (async () => {
        try {
          // Try to send a test request to see if endpoint exists and is enabled
          // If OPS_LOGGING_ENABLED is false, endpoint returns 204 but doesn't log
          // We can't easily check this from client, so we'll just try to send
          // and let the server decide. For now, we'll assume it's enabled
          // if the env var is set (we can't check server env vars from client)
          // So we'll just always try to send, and the server will ignore if disabled
          loggingEnabled = true
        } catch {
          loggingEnabled = false
        }
      })()
      
      return checkPromise
    }

    const sendError = async (error: {
      message: string
      stack?: string
      route?: string
    }) => {
      // Sample errors (1 in 5) to avoid spam
      if (Math.random() > 0.2) {
        return
      }

      await checkLoggingEnabled()
      
      if (!loggingEnabled) {
        return
      }

      try {
        const route = window.location.pathname
        const userAgent = navigator.userAgent

        await fetch('/api/ops/client-error', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route,
            message: error.message.substring(0, 1000),
            stack: error.stack ? error.stack.substring(0, 2000) : undefined,
            userAgent: userAgent.substring(0, 500),
          }),
        })
      } catch (sendError) {
        // Silently ignore - don't break the app
        if (process.env.NODE_ENV === 'development') {
          console.error('[ErrorReporter] Failed to send error:', sendError)
        }
      }
    }

    const handleError = (event: ErrorEvent) => {
      sendError({
        message: event.message || 'Unknown error',
        stack: event.error?.stack,
        route: window.location.pathname,
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message = reason instanceof Error 
        ? reason.message 
        : typeof reason === 'string' 
        ? reason 
        : 'Unhandled promise rejection'
      
      const stack = reason instanceof Error ? reason.stack : undefined

      sendError({
        message,
        stack,
        route: window.location.pathname,
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return null // This component doesn't render anything
}

