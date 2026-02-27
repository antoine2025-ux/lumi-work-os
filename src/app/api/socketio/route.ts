import { NextRequest } from 'next/server'

/**
 * Socket.io health/info endpoint.
 * WebSocket upgrade happens at the HTTP server level (custom server), not in this route.
 * Use npm run dev:realtime or npm start to enable Socket.io.
 */
export async function GET(_req: NextRequest) {
  return Response.json({
    status: 'ok',
    message:
      'Socket.io is served by the custom server at the default path. Use npm run dev:realtime or npm start.',
  })
}

export async function POST(_req: NextRequest) {
  return Response.json({
    status: 'ok',
    message:
      'Socket.io is served by the custom server at the default path. Use npm run dev:realtime or npm start.',
  })
}
