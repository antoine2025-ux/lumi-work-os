import { unstable_cache } from "next/cache"

export function cacheOrg<TArgs extends any[], TResult>(
  keyParts: string[],
  fn: (...args: TArgs) => Promise<TResult>,
  opts?: { revalidate?: number; tags?: string[] }
) {
  const cached = unstable_cache(
    async (...args: TArgs) => fn(...args),
    keyParts,
    {
      revalidate: opts?.revalidate ?? 30,
      tags: opts?.tags ?? [],
    }
  )
  return cached
}

