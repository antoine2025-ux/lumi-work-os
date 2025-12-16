/**
 * Unified Event Bus System for Loopwell
 * 
 * This provides a simple pub/sub event system for internal server-side events.
 * Events are synchronous and support multiple subscribers.
 */

type EventHandler<T = any> = (event: T) => void | Promise<void>;

const eventHandlers = new Map<string, Set<EventHandler>>();

/**
 * Subscribe to an event type.
 * Returns an unsubscribe function.
 */
export function on<T = any>(
  eventType: string,
  handler: EventHandler<T>
): () => void {
  if (!eventHandlers.has(eventType)) {
    eventHandlers.set(eventType, new Set());
  }

  const handlers = eventHandlers.get(eventType)!;
  handlers.add(handler);

  // Return unsubscribe function
  return () => {
    handlers.delete(handler);
    if (handlers.size === 0) {
      eventHandlers.delete(eventType);
    }
  };
}

/**
 * Emit an event to all registered handlers.
 * Handlers are called synchronously in the order they were registered.
 * If a handler throws, it doesn't stop other handlers from executing.
 */
export async function emitEvent<T = any>(
  eventType: string,
  event: T
): Promise<void> {
  const handlers = eventHandlers.get(eventType);
  if (!handlers || handlers.size === 0) {
    // No handlers registered, silently continue
    return;
  }

  // Call all handlers, catching errors so one failure doesn't stop others
  const promises: Promise<void>[] = [];
  for (const handler of handlers) {
    try {
      const result = handler(event);
      if (result instanceof Promise) {
        promises.push(
          result.catch((error) => {
            console.error(`Error in event handler for ${eventType}:`, error);
          })
        );
      }
    } catch (error) {
      console.error(`Error in event handler for ${eventType}:`, error);
    }
  }

  // Wait for all async handlers to complete
  await Promise.all(promises);
}

/**
 * Remove all handlers for a specific event type.
 * Useful for cleanup in tests.
 */
export function removeAllHandlers(eventType: string): void {
  eventHandlers.delete(eventType);
}

/**
 * Get the number of handlers for an event type.
 * Useful for testing.
 */
export function getHandlerCount(eventType: string): number {
  return eventHandlers.get(eventType)?.size ?? 0;
}

/**
 * Clear all event handlers.
 * Useful for cleanup in tests.
 */
export function clearAllHandlers(): void {
  eventHandlers.clear();
}

