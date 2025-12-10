import { NextRequest, NextResponse } from 'next/server'
import { logger, extractRequestContext } from '@/lib/logger'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const context = extractRequestContext(request)
  
  // Log incoming request
  logger.logRequest(request, context)
  
  // Add request ID to headers for tracing
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', context.requestId!)
  
  // Check for workspace slug in URL path (/w/[workspaceSlug]/...)
  const pathname = request.nextUrl.pathname
  const slugMatch = pathname.match(/^\/w\/([^\/]+)/)
  
  if (slugMatch) {
    const workspaceSlug = slugMatch[1]
    
    // Lightweight validation: ensure slug is not empty and is alphanumeric/hyphen
    // Full membership validation happens in getUnifiedAuth
    if (!workspaceSlug || !/^[a-z0-9-]+$/.test(workspaceSlug)) {
      // Invalid slug format - return 404
      return NextResponse.json(
        { error: 'Invalid workspace slug format' },
        { status: 404 }
      )
    }
    
    // Check if user is authenticated (lightweight check)
    // Full auth and membership validation happens in getUnifiedAuth
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })
    
    if (!token) {
      // Not authenticated - redirect to login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // Set workspace slug in header for getUnifiedAuth (optional optimization)
    requestHeaders.set('x-workspace-slug', workspaceSlug)
  }
  
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



