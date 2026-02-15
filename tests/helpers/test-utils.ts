/**
 * Test Utilities
 * 
 * Reusable helper functions for mocking auth, Prisma, and creating test requests.
 * Pattern based on existing tests/api/projects.auth.spec.ts
 */

import { vi } from 'vitest'
import { NextRequest } from 'next/server'

export interface MockAuthContextOptions {
  userId?: string
  workspaceId?: string
  roles?: string[]
  isDev?: boolean
  email?: string
  name?: string
  isFirstTime?: boolean
  isAuthenticated?: boolean
}

/**
 * Creates a mock AuthContext with sensible defaults
 */
export function mockAuthContext(options: MockAuthContextOptions = {}) {
  return {
    user: {
      userId: options.userId || 'user-1',
      activeWorkspaceId: options.workspaceId || 'workspace-1',
      roles: options.roles || ['MEMBER'],
      isDev: options.isDev || false,
      email: options.email || 'test@example.com',
      name: options.name || 'Test User',
      isFirstTime: options.isFirstTime || false,
    },
    workspaceId: options.workspaceId || 'workspace-1',
    isAuthenticated: options.isAuthenticated !== undefined ? options.isAuthenticated : true,
    isDevelopment: options.isDev || false,
  }
}

/**
 * Creates a NextRequest for testing
 */
export function mockRequest(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: unknown
    searchParams?: Record<string, string>
  } = {}
): NextRequest {
  const { method = 'GET', headers = {}, body, searchParams = {} } = options

  // Build URL with search params
  const urlObj = new URL(url, 'http://localhost:3000')
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value)
  })

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body) {
    requestInit.body = JSON.stringify(body)
  }

  return new NextRequest(urlObj.toString(), requestInit)
}

/**
 * Sets up auth mocks with a specific auth context
 */
export async function setupAuthMocks(
  authContext: ReturnType<typeof mockAuthContext> | Error
) {
  const { getUnifiedAuth } = await import('@/lib/unified-auth')
  const { assertAccess } = await import('@/lib/auth/assertAccess')
  const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')

  if (authContext instanceof Error) {
    vi.mocked(getUnifiedAuth).mockRejectedValue(authContext)
  } else {
    vi.mocked(getUnifiedAuth).mockResolvedValue(authContext)
    vi.mocked(assertAccess).mockResolvedValue(undefined)
    vi.mocked(setWorkspaceContext).mockReturnValue(undefined)
  }
}

/**
 * Sets up Prisma mocks for specific models
 * 
 * @example
 * await setupPrismaMocks({
 *   project: {
 *     findMany: vi.fn().mockResolvedValue([]),
 *     create: vi.fn().mockResolvedValue({ id: 'project-1' })
 *   }
 * })
 */
export async function setupPrismaMocks(modelMocks: Record<string, Record<string, unknown>>) {
  const { prisma } = await import('@/lib/db')

  Object.entries(modelMocks).forEach(([model, methods]) => {
    Object.entries(methods).forEach(([method, mock]) => {
      // @ts-expect-error - Dynamic model/method access
      if (prisma[model] && prisma[model][method]) {
        // @ts-expect-error - Dynamic model/method access
        vi.mocked(prisma[model][method]).mockImplementation(mock)
      }
    })
  })
}

/**
 * Clears all test mocks - call in beforeEach
 */
export function clearAllTestMocks() {
  vi.clearAllMocks()
}

/**
 * Helper to extract JSON from Response
 */
export async function getResponseJson(response: Response) {
  return await response.json()
}

/**
 * Helper to assert response status and get JSON
 */
export async function expectResponseStatus(
  response: Response,
  expectedStatus: number
) {
  if (response.status !== expectedStatus) {
    const body = await response.text()
    throw new Error(
      `Expected status ${expectedStatus} but got ${response.status}. Body: ${body}`
    )
  }
  return response
}
