#!/usr/bin/env tsx
/**
 * Standalone Hocuspocus collaboration server.
 * Run with: npm run dev:collab
 *
 * Use when running `npm run dev` (next dev) and you need collab.
 * When using `npm run dev:realtime` or `npm start`, Hocuspocus runs in server.js.
 */
import { createCollabServer } from '../src/lib/collab/hocuspocus-server'

// Verify env loading (first 8 chars only for security)
const ns = process.env.NEXTAUTH_SECRET
const css = process.env.COLLAB_SERVICE_SECRET
console.log('[Collab] NEXTAUTH_SECRET:', ns ? `${ns.slice(0, 8)}...` : '(not set)')
console.log('[Collab] COLLAB_SERVICE_SECRET:', css ? `${css.slice(0, 8)}...` : '(not set)')

const server = createCollabServer()
server.listen().then(() => {
  console.log('Hocuspocus collab server running on port 1234')
})
