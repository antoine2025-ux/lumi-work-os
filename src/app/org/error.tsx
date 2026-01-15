"use client"

export default function OrgError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-red-900/60 bg-red-950/60 px-6 py-6 text-[13px] text-red-100">
          <div className="font-semibold">Error loading org page</div>
          <div className="mt-2 text-red-200">
            <div className="mb-2">{error.message}</div>
            {process.env.NODE_ENV === "development" && error.stack && (
              <pre className="mt-4 whitespace-pre-wrap text-xs opacity-75">
                {error.stack}
              </pre>
            )}
            {error.digest && (
              <div className="mt-2 text-xs opacity-75">Digest: {error.digest}</div>
            )}
          </div>
          <button
            onClick={reset}
            className="mt-4 rounded-xl border border-red-800 bg-red-900/40 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-900/60"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}

