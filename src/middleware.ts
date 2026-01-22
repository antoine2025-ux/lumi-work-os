import { NextRequest, NextResponse } from 'next/server'
import { logger, extractRequestContext } from '@/lib/logger'
import { getToken } from 'next-auth/jwt'

/**
 * Protected routes that require authentication.
 * These routes will redirect to /login if user is not authenticated.
 */
const PROTECTED_ROUTES = [
  '/home',
  '/projects',
  '/wiki',
  '/todos',
  '/settings',
  '/my-tasks',
  '/calendar',
  '/ask',
  '/org',
]

/**
 * Public routes that should redirect authenticated users away.
 */
const AUTH_ROUTES = ['/login', '/register', '/signup']

/**
 * Check if a pathname matches any protected route prefix.
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))
}

/**
 * Check if a pathname is an auth route (login/register).
 */
function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))
}

export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const context = extractRequestContext(request)
  
  // Log incoming request
  logger.logRequest(request, context)
  
  // Add request ID to headers for tracing
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', context.requestId!)
  
  const pathname = request.nextUrl.pathname
  
  // Get auth token (lightweight check)
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })
  
  const isAuthenticated = !!token
  
  // --- Protected Route Check ---
  // If accessing a protected route without auth, redirect to login
  if (isProtectedRoute(pathname) && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }
  
  // --- Auth Route Check ---
  // If authenticated user tries to access login/register, redirect to home
  if (isAuthRoute(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL('/home', request.url))
  }
  
  // --- Workspace Slug Route Check ---
  // Check for workspace slug in URL path (/w/[workspaceSlug]/...)
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
    
    if (!isAuthenticated) {
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
  
  // Log response after processing (synchronous to avoid browser API usage)
  const endTime = Date.now()
  const responseTime = endTime - startTime
  
  // Log synchronously - middleware should be fast and synchronous
  // Avoid setTimeout as it can cause webpack to bundle browser code
  logger.logResponse(request, response.status, responseTime, context)
  
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
