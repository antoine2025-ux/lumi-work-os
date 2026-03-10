/**
 * Unit tests for Google Drive client helper.
 * Tests token fetch, client creation, and error handling.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

const { mockIntegrationFindFirst } = vi.hoisted(() => ({
  mockIntegrationFindFirst: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    integration: {
      findFirst: mockIntegrationFindFirst,
    },
  },
}))

vi.mock('@/lib/prisma/scopingMiddleware', () => ({
  setWorkspaceContext: vi.fn(),
}))

const mockSetCredentials = vi.fn()
const mockDriveInstance = { files: { list: vi.fn() } }

vi.mock('@/lib/drive', () => ({
  getDriveOAuth2Client: () => ({
    setCredentials: mockSetCredentials,
  }),
  getDriveApiClient: () => mockDriveInstance,
}))

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { getDriveClientForUser, DriveNotConnectedError } from '../client'

describe('getDriveClientForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns Drive client when user has valid tokens', async () => {
    mockIntegrationFindFirst.mockResolvedValue({
      id: 'int-1',
      type: 'GOOGLE_DRIVE',
      config: {
        users: {
          'user-1': { accessToken: 'access-123', refreshToken: 'refresh-456' },
        },
      },
    })

    const client = await getDriveClientForUser('user-1', 'ws-1')

    expect(client).toBe(mockDriveInstance)
    expect(mockSetCredentials).toHaveBeenCalledWith({
      access_token: 'access-123',
      refresh_token: 'refresh-456',
    })
  })

  it('throws DriveNotConnectedError when no integration exists', async () => {
    mockIntegrationFindFirst.mockResolvedValue(null)

    await expect(getDriveClientForUser('user-1', 'ws-1')).rejects.toThrow(
      DriveNotConnectedError,
    )
  })

  it('throws DriveNotConnectedError when user has no tokens', async () => {
    mockIntegrationFindFirst.mockResolvedValue({
      id: 'int-1',
      type: 'GOOGLE_DRIVE',
      config: { users: {} },
    })

    await expect(getDriveClientForUser('user-1', 'ws-1')).rejects.toThrow(
      DriveNotConnectedError,
    )
  })

  it('throws DriveNotConnectedError when user tokens have no accessToken', async () => {
    mockIntegrationFindFirst.mockResolvedValue({
      id: 'int-1',
      type: 'GOOGLE_DRIVE',
      config: {
        users: {
          'user-1': { accessToken: '', refreshToken: null },
        },
      },
    })

    await expect(getDriveClientForUser('user-1', 'ws-1')).rejects.toThrow(
      DriveNotConnectedError,
    )
  })

  it('handles missing users key in config', async () => {
    mockIntegrationFindFirst.mockResolvedValue({
      id: 'int-1',
      type: 'GOOGLE_DRIVE',
      config: {},
    })

    await expect(getDriveClientForUser('user-1', 'ws-1')).rejects.toThrow(
      DriveNotConnectedError,
    )
  })

  it('sets credentials with undefined refresh_token when null', async () => {
    mockIntegrationFindFirst.mockResolvedValue({
      id: 'int-1',
      type: 'GOOGLE_DRIVE',
      config: {
        users: {
          'user-1': { accessToken: 'access-123', refreshToken: null },
        },
      },
    })

    await getDriveClientForUser('user-1', 'ws-1')

    expect(mockSetCredentials).toHaveBeenCalledWith({
      access_token: 'access-123',
      refresh_token: undefined,
    })
  })
})
