export async function perf<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now()
  const res = await fn()
  const ms = Date.now() - start
  if (process.env.NODE_ENV !== "production" && ms > 300) {
    // eslint-disable-next-line no-console
    console.warn(`[ORG PERF] ${label} took ${ms}ms`)
  }
  return res
}

