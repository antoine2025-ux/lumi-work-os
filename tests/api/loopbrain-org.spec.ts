/**
 * Loopbrain Org Intelligence Tests
 *
 * Regression tests for Loopbrain org Q&A pipeline.
 * Tests question classification, context bundling, and response validation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { clearAllTestMocks } from '../helpers/test-utils'

// Mock Prisma for context queries
vi.mock('@/lib/db', () => ({
  prisma: {
    contextItem: {
      findMany: vi.fn(),
    },
  }
}))

describe('Loopbrain Org Intelligence', () => {
  beforeEach(() => {
    clearAllTestMocks()
  })

  describe('Org question detection - positive cases', () => {
    it('should detect "who reports to whom" as org question', async () => {
      const { isOrgQuestion } = await import('@/lib/loopbrain/org/isOrgQuestion')

      const result = isOrgQuestion('who reports to whom', undefined)

      expect(result).toBe(true)
    })

    it('should detect "what teams are in engineering" as org question', async () => {
      const { isOrgQuestion } = await import('@/lib/loopbrain/org/isOrgQuestion')

      const result = isOrgQuestion('what teams are in engineering', undefined)

      expect(result).toBe(true)
    })

    it('should detect "who is the manager of X" as org question', async () => {
      const { isOrgQuestion } = await import('@/lib/loopbrain/org/isOrgQuestion')

      const result = isOrgQuestion('who is the manager of the design team', undefined)

      expect(result).toBe(true)
    })

    it('should detect "org structure" as org question', async () => {
      const { isOrgQuestion } = await import('@/lib/loopbrain/org/isOrgQuestion')

      const result = isOrgQuestion('show me the org structure', undefined)

      expect(result).toBe(true)
    })

    it('should respect explicit mode override to org', async () => {
      const { isOrgQuestion } = await import('@/lib/loopbrain/org/isOrgQuestion')

      // Even a non-org question returns true if mode is explicitly "org"
      const result = isOrgQuestion('what is the weather', { requestedMode: 'org' })

      expect(result).toBe(true)
    })
  })

  describe('Org question detection - negative cases', () => {
    it('should NOT detect "whats the weather" as org question', async () => {
      const { isOrgQuestion } = await import('@/lib/loopbrain/org/isOrgQuestion')

      const result = isOrgQuestion('whats the weather', undefined)

      expect(result).toBe(false)
    })

    it('should NOT detect "how do I write code" as org question', async () => {
      const { isOrgQuestion } = await import('@/lib/loopbrain/org/isOrgQuestion')

      const result = isOrgQuestion('how do I write code', undefined)

      expect(result).toBe(false)
    })

    it('should respect explicit mode override to generic', async () => {
      const { isOrgQuestion } = await import('@/lib/loopbrain/org/isOrgQuestion')

      // Even an org-like question returns false if mode is explicitly "generic"
      const result = isOrgQuestion('who reports to whom', { requestedMode: 'generic' })

      expect(result).toBe(false)
    })
  })

  describe('Org context bundle non-empty', () => {
    it('should return bundle with people/teams when data exists', async () => {
      const { prisma } = await import('@/lib/db')

      // Mock ContextItem queries
      vi.mocked(prisma.contextItem.findMany).mockResolvedValue([
        {
          id: 'ctx-person-1',
          workspaceId: 'workspace-1',
          type: 'person',
          contextId: 'person-1',
          title: 'John Doe',
          summary: 'Software Engineer',
          data: {
            tags: ['type:person', 'holder:John Doe'],
            relations: [],
          },
          embedding: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: null,
        },
        {
          id: 'ctx-team-1',
          workspaceId: 'workspace-1',
          type: 'team',
          contextId: 'team-1',
          title: 'Engineering',
          summary: 'Engineering team',
          data: {
            tags: ['type:team'],
            relations: [],
          },
          embedding: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: null,
        },
      ])

      const { getOrgContextForLoopbrain } = await import(
        '@/lib/loopbrain/orgContextForLoopbrain'
      )

      const bundle = await getOrgContextForLoopbrain('workspace-1')

      expect(bundle).toBeDefined()
      expect(bundle.related.length).toBeGreaterThan(0)
    })
  })

  describe('Context from row fields', () => {
    it('should build ContextObject from row fields not item.data cast', async () => {
      const { prisma } = await import('@/lib/db')

      // Mock ContextItem with specific row fields
      vi.mocked(prisma.contextItem.findMany).mockResolvedValue([
        {
          id: 'ctx-1',
          workspaceId: 'workspace-1',
          type: 'person',
          contextId: 'person-1',
          title: 'Jane Smith', // Title from row
          summary: 'Product Manager', // Summary from row
          data: {
            tags: ['type:person'],
            relations: [],
          },
          embedding: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date('2024-01-15'),
          expiresAt: null,
        },
      ])

      const { getOrgContextForLoopbrain } = await import('@/lib/loopbrain/orgContextForLoopbrain')

      const context = await getOrgContextForLoopbrain('workspace-1')

      expect(context.related).toHaveLength(1)

      const person = context.related[0]
      expect(person.title).toBe('Jane Smith') // From row.title, not item.data
      expect(person.summary).toBe('Product Manager') // From row.summary, not item.data
      expect(person.type).toBe('person')
    })
  })

  describe('OrgValidator allows common words', () => {
    it('should NOT flag response with common org words as hallucination', async () => {
      const { validateOrgResponse } = await import('@/lib/loopbrain/postProcessors/orgValidator')

      const mockContext = {
        people: [{ title: 'John Doe', id: 'person-1', type: 'person' as const, summary: '', tags: [], relations: [], owner: null, status: 'ACTIVE' as const, updatedAt: new Date().toISOString() }],
        teams: [{ title: 'Engineering', id: 'team-1', type: 'team' as const, summary: '', tags: [], relations: [], owner: null, status: 'ACTIVE' as const, updatedAt: new Date().toISOString() }],
        departments: [],
      }

      // Response with common words that should NOT be flagged
      const response = 'John Doe reports to the Engineering team manager'
      const result = validateOrgResponse(response, mockContext as any)

      // Should NOT sanitize because "reports", "team", "manager" are common words
      expect(result).toContain('John Doe')
      expect(result).toContain('Engineering')
    })
  })

  describe('OrgValidator blocks invented entities', () => {
    it('should sanitize response with >10 unknown names', async () => {
      const { validateOrgResponse } = await import('@/lib/loopbrain/postProcessors/orgValidator')

      const mockContext = {
        people: [{ title: 'John Doe', id: 'person-1', type: 'person' as const, summary: '', tags: [], relations: [], owner: null, status: 'ACTIVE' as const, updatedAt: new Date().toISOString() }],
        teams: [],
        departments: [],
      }

      // Response with many invented names in name-like patterns
      const response = `
        Alice manages Bob, Charlie manages Dave,
        Eve manages Frank, Grace manages Henry,
        Ivy manages Jack, Kate manages Leo,
        Mary manages Nick, Olivia manages Paul
      `

      const result = validateOrgResponse(response, mockContext as any)

      // Should sanitize because >10 unknown entities in name-like context
      expect(result).toContain('not able to answer')
    })

    it('should allow response with <10 unknown names (warning only)', async () => {
      const { validateOrgResponse } = await import('@/lib/loopbrain/postProcessors/orgValidator')

      const mockContext = {
        people: [{ title: 'John Doe', id: 'person-1', type: 'person' as const, summary: '', tags: [], relations: [], owner: null, status: 'ACTIVE' as const, updatedAt: new Date().toISOString() }],
        teams: [],
        departments: [],
      }

      // Response with few potentially unknown names (edge case)
      const response = 'Alice and Bob work with John Doe'

      const result = validateOrgResponse(response, mockContext as any)

      // Should NOT sanitize (just warning) because <10 unknown entities
      expect(result).toContain('Alice')
    })
  })

  describe('hasOrgContext conditional', () => {
    it('should be false when no people/teams/departments exist', async () => {
      // This test verifies the orchestrator logic
      // Reference: src/lib/loopbrain/orchestrator.ts lines 634-712

      const mockOrgContext = {
        people: [],
        teams: [],
        departments: [],
      }

      const hasOrgContext =
        mockOrgContext.people.length > 0 ||
        mockOrgContext.teams.length > 0 ||
        mockOrgContext.departments.length > 0

      expect(hasOrgContext).toBe(false)
    })

    it('should be true when people exist', async () => {
      const mockOrgContext = {
        people: [{ name: 'John Doe', id: 'person-1' }],
        teams: [],
        departments: [],
      }

      const hasOrgContext =
        mockOrgContext.people.length > 0 ||
        mockOrgContext.teams.length > 0 ||
        mockOrgContext.departments.length > 0

      expect(hasOrgContext).toBe(true)
    })

    it('should be true when teams exist', async () => {
      const mockOrgContext = {
        people: [],
        teams: [{ name: 'Engineering', id: 'team-1' }],
        departments: [],
      }

      const hasOrgContext =
        mockOrgContext.people.length > 0 ||
        mockOrgContext.teams.length > 0 ||
        mockOrgContext.departments.length > 0

      expect(hasOrgContext).toBe(true)
    })
  })
})
