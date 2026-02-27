import { Server } from '@hocuspocus/server'

/**
 * Creates and returns a Hocuspocus collaboration server instance.
 * Used for real-time wiki page editing via Yjs.
 *
 * Phase 1: Accept all connections, no DB persistence.
 * Phase 3: Add onLoadDocument/onStoreDocument for DB persistence.
 * Phase 4: Add proper auth in onAuthenticate.
 */
export function createCollabServer(): InstanceType<typeof Server> {
  const server = new Server({
    name: 'loopwell-collab',
    port: 1234,

    // Phase 1: Accept all connections
    async onAuthenticate(data) {
      return {
        user: {
          id: data.token ?? 'anonymous',
          name: 'User',
        },
      }
    },

    // Phase 1: Let Hocuspocus create empty doc
    async onLoadDocument() {
      // Return undefined to use default empty doc
    },

    // Phase 1: No-op
    async onStoreDocument() {
      // Phase 3 will save to DB
    },
  })

  return server
}
