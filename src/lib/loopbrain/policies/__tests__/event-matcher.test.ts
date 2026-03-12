import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { EmailReceivedEvent } from '../event-matcher'

const { mockFindMany, mockFindFirst } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindFirst: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prismaUnscoped: {
    loopbrainPolicy: { findMany: mockFindMany },
    policyExecution: { findFirst: mockFindFirst },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { matchEmailEvent } from '../event-matcher'

describe('matchEmailEvent', () => {
  const baseEvent: EmailReceivedEvent = {
    workspaceId: 'ws1',
    userId: 'u1',
    subject: 'Weekly Meeting Notes',
    from: 'boss@company.com',
    snippet: 'Here are the notes from our weekly standup meeting',
    threadId: 'thread123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFindFirst.mockResolvedValue(null)
  })

  it('matches a policy with a matching keyword', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'p1',
        triggerConfig: { type: 'EMAIL_KEYWORD', keywords: ['meeting notes'] },
      },
    ])

    const result = await matchEmailEvent(baseEvent)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('p1')
  })

  it('matches case-insensitively', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'p1',
        triggerConfig: { type: 'EMAIL_KEYWORD', keywords: ['MEETING NOTES'] },
      },
    ])

    const result = await matchEmailEvent(baseEvent)
    expect(result).toHaveLength(1)
  })

  it('does not match when no keywords match', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'p1',
        triggerConfig: { type: 'EMAIL_KEYWORD', keywords: ['quarterly report'] },
      },
    ])

    const result = await matchEmailEvent(baseEvent)
    expect(result).toHaveLength(0)
  })

  it('filters by fromFilter when specified', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'p1',
        triggerConfig: {
          type: 'EMAIL_KEYWORD',
          keywords: ['meeting'],
          fromFilter: 'other@company.com',
        },
      },
    ])

    const result = await matchEmailEvent(baseEvent)
    expect(result).toHaveLength(0)
  })

  it('matches when fromFilter matches', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'p1',
        triggerConfig: {
          type: 'EMAIL_KEYWORD',
          keywords: ['meeting'],
          fromFilter: 'boss',
        },
      },
    ])

    const result = await matchEmailEvent(baseEvent)
    expect(result).toHaveLength(1)
  })

  it('deduplicates — skips if already triggered for same threadId', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'p1',
        triggerConfig: { type: 'EMAIL_KEYWORD', keywords: ['meeting'] },
      },
    ])
    mockFindFirst.mockResolvedValue({ id: 'existing-exec' })

    const result = await matchEmailEvent(baseEvent)
    expect(result).toHaveLength(0)
  })

  it('matches multiple policies for the same event', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'p1',
        triggerConfig: { type: 'EMAIL_KEYWORD', keywords: ['meeting'] },
      },
      {
        id: 'p2',
        triggerConfig: { type: 'EMAIL_KEYWORD', keywords: ['notes'] },
      },
    ])

    const result = await matchEmailEvent(baseEvent)
    expect(result).toHaveLength(2)
  })

  it('skips policies with empty keywords', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'p1',
        triggerConfig: { type: 'EMAIL_KEYWORD', keywords: [] },
      },
    ])

    const result = await matchEmailEvent(baseEvent)
    expect(result).toHaveLength(0)
  })

  it('returns empty array when no policies exist', async () => {
    mockFindMany.mockResolvedValue([])

    const result = await matchEmailEvent(baseEvent)
    expect(result).toHaveLength(0)
  })
})
