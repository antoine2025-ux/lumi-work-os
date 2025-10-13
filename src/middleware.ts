import { NextRequest, NextResponse } from 'next/server'
import { logger, extractRequestContext } from '@/lib/logger'

export function middleware(request: NextRequest) {
  const startTime = Date.now()
  const context = extractRequestContext(request)
  
  // Log incoming request
  logger.logRequest(request, context)
  
  // Add request ID to headers for tracing
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', context.requestId!)
  
  // Create response
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  
  // Add request ID to response headers
  response.headers.set('x-request-id', context.requestId!)
  
  // Log response after processing
  const endTime = Date.now()
  const responseTime = endTime - startTime
  
  // Use setTimeout to log after response is sent
  setTimeout(() => {
    logger.logResponse(request, response.status, responseTime, context)
  }, 0)
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}



