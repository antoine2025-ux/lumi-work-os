/**
 * Query performance logging utilities for development.
 * Helps identify slow queries during development.
 */

const ENABLE_LOGGING = process.env.NODE_ENV !== "production";

/**
 * Log query duration if it exceeds the threshold.
 */
export function logQueryDuration<T>(
  name: string,
  fn: () => Promise<T>,
  thresholdMs: number = 50
): Promise<T> {
  if (!ENABLE_LOGGING) {
    return fn();
  }

  const start = Date.now();
  return fn().then((result) => {
    const duration = Date.now() - start;
    if (duration > thresholdMs) {
      console.log(`[Query Performance] ${name} took ${duration}ms (threshold: ${thresholdMs}ms)`);
    }
    return result;
  });
}

/**
 * Time a synchronous operation.
 */
export function timeOperation<T>(
  name: string,
  fn: () => T,
  thresholdMs: number = 10
): T {
  if (!ENABLE_LOGGING) {
    return fn();
  }

  const start = Date.now();
  const result = fn();
  const duration = Date.now() - start;
  if (duration > thresholdMs) {
    console.log(`[Operation Performance] ${name} took ${duration}ms (threshold: ${thresholdMs}ms)`);
  }
  return result;
}

