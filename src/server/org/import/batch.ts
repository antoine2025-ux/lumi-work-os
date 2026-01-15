export async function runInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (batch: T[], batchIndex: number) => Promise<void>
) {
  const size = Math.max(1, batchSize)
  let idx = 0
  let bi = 0
  while (idx < items.length) {
    const batch = items.slice(idx, idx + size)
    await fn(batch, bi)
    idx += size
    bi += 1
  }
}

