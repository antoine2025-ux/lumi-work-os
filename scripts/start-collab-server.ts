#!/usr/bin/env tsx
/**
 * Standalone Hocuspocus collaboration server.
 * Run with: npm run dev:collab
 *
 * Use when running `npm run dev` (next dev) and you need collab.
 * When using `npm run dev:realtime` or `npm start`, Hocuspocus runs in server.js.
 */
import { createCollabServer } from '../src/lib/collab/hocuspocus-server'

const server = createCollabServer()
server.listen().then(() => {
  console.log('Hocuspocus collab server running on port 1234')
})
