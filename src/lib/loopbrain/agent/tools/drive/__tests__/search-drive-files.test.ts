/**
 * Unit tests for the searchDriveFiles Loopbrain tool.
 * Tests search execution, permission enforcement, and error handling.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockGetDriveClientForUser = vi.fn()
const mockSearchDriveFiles = vi.fn()

vi.mock('@/lib/integrations/drive/client', () => ({
  getDriveClientForUser: (...args: unknown[]) => mockGetDriveClientForUser(...args),
  DriveNotConnectedError: class DriveNotConnectedError extends Error {
    constructor(msg = 'Google Drive not connected. Connect in Settings → Integrations.') {
      super(msg)
      this.name = 'DriveNotConnectedError'
    }
  },
}))

vi.mock('@/lib/integrations/drive/search', () => ({
  searchDriveFiles: (...args: unknown[]) => mockSearchDriveFiles(...args),
}))

vi.mock('@/lib/integrations/drive/retry', () => ({
  DriveRateLimitError: class DriveRateLimitError extends Error {
    constructor(msg = 'Google Drive API rate limit exceeded. Please try again later.') {
      super(msg)
      this.name = 'DriveRateLimitError'
    }
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { searchDriveFilesTool } from '../search-drive-files'
import type { AgentContext } from '../../../types'

function makeCtx(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    workspaceId: 'ws-1',
    userId: 'user-1',
    workspaceSlug: 'test-ws',
    userRole: 'MEMBER',
    personId: 'pos-1',
    ...overrides,
  }
}

describe('searchDriveFilesTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has correct tool metadata', () => {
    expect(searchDriveFilesTool.name).toBe('searchDriveFiles')
    expect(searchDriveFilesTool.category).toBe('drive')
    expect(searchDriveFilesTool.requiresConfirmation).toBe(false)
    expect(searchDriveFilesTool.permissions.minimumRole).toBe('MEMBER')
  })

  it('returns search results on success', async () => {
    const mockClient = {}
    mockGetDriveClientForUser.mockResolvedValue(mockClient)

    const mockFiles = [
      {
        id: 'file-1',
        name: 'Budget 2026',
        mimeType: 'application/vnd.google-apps.document',
        webViewLink: 'https://docs.google.com/doc/file-1',
        modifiedTime: '2026-03-01T10:00:00Z',
      },
      {
        id: 'file-2',
        name: 'Budget Summary',
        mimeType: 'application/vnd.google-apps.spreadsheet',
        webViewLink: 'https://docs.google.com/sheet/file-2',
        modifiedTime: '2026-02-28T15:00:00Z',
      },
    ]
    mockSearchDriveFiles.mockResolvedValue(mockFiles)

    const result = await searchDriveFilesTool.execute(
      { query: 'budget' },
      makeCtx(),
    )

    expect(result.success).toBe(true)
    expect(result.humanReadable).toContain('2 file(s)')
    expect(result.data?.files).toHaveLength(2)

    expect(mockGetDriveClientForUser).toHaveBeenCalledWith('user-1', 'ws-1')
    expect(mockSearchDriveFiles).toHaveBeenCalledWith(mockClient, 'budget', {
      mimeType: undefined,
      folderId: undefined,
      maxResults: 10,
    })
  })

  it('returns helpful message when no results found', async () => {
    mockGetDriveClientForUser.mockResolvedValue({})
    mockSearchDriveFiles.mockResolvedValue([])

    const result = await searchDriveFilesTool.execute(
      { query: 'nonexistent document xyz' },
      makeCtx(),
    )

    expect(result.success).toBe(true)
    expect(result.humanReadable).toContain('No files found')
  })

  it('passes mimeType and folderId filters', async () => {
    mockGetDriveClientForUser.mockResolvedValue({})
    mockSearchDriveFiles.mockResolvedValue([])

    await searchDriveFilesTool.execute(
      {
        query: 'notes',
        mimeType: 'application/vnd.google-apps.document',
        folderId: 'folder-123',
        maxResults: 5,
      },
      makeCtx(),
    )

    expect(mockSearchDriveFiles).toHaveBeenCalledWith({}, 'notes', {
      mimeType: 'application/vnd.google-apps.document',
      folderId: 'folder-123',
      maxResults: 5,
    })
  })

  it('returns error when Drive is not connected', async () => {
    const { DriveNotConnectedError } = await import('@/lib/integrations/drive/client')
    mockGetDriveClientForUser.mockRejectedValue(new DriveNotConnectedError())

    const result = await searchDriveFilesTool.execute(
      { query: 'test' },
      makeCtx(),
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('DRIVE_NOT_CONNECTED')
    expect(result.humanReadable).toContain('not connected')
  })

  it('returns error on rate limit', async () => {
    const { DriveRateLimitError } = await import('@/lib/integrations/drive/retry')
    mockGetDriveClientForUser.mockResolvedValue({})
    mockSearchDriveFiles.mockRejectedValue(new DriveRateLimitError())

    const result = await searchDriveFilesTool.execute(
      { query: 'test' },
      makeCtx(),
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('RATE_LIMITED')
  })

  it('returns generic error for unexpected failures', async () => {
    mockGetDriveClientForUser.mockResolvedValue({})
    mockSearchDriveFiles.mockRejectedValue(new Error('Network failure'))

    const result = await searchDriveFilesTool.execute(
      { query: 'test' },
      makeCtx(),
    )

    expect(result.success).toBe(false)
    expect(result.humanReadable).toContain('Failed to search')
  })
})
