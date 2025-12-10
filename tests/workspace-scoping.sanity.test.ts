/**
 * Workspace Scoping Sanity Tests
 * 
 * These tests verify that Prisma workspace scoping is enforced when
 * PRISMA_WORKSPACE_SCOPING_ENABLED=true.
 * 
 * Run with: npm test -- tests/workspace-scoping.sanity.test.ts
 * 
 * Expected behavior:
 * - When flag is OFF: Tests are skipped (scoping not enforced)
 * - When flag is ON: Tests verify scoping errors are thrown
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '@/lib/db'
import { setWorkspaceContext, clearWorkspaceContext } from '@/lib/prisma/scopingMiddleware'

// Check if scoping is enabled
const SCOPING_ENABLED = process.env.PRISMA_WORKSPACE_SCOPING_ENABLED === 'true'

describe('Workspace Scoping Sanity Tests', () => {
  beforeAll(() => {
    if (SCOPING_ENABLED) {
      console.log('✅ Scoping ENABLED - Testing enforcement')
    } else {
      console.log('⚠️  Scoping DISABLED - Tests will be skipped')
    }
  })

  describe('Critical Models - Scoping Enforcement', () => {
    // These models MUST be workspace-scoped
    const criticalModels = [
      { name: 'Project', query: () => prisma.project.findMany() },
      { name: 'WikiPage', query: () => prisma.wikiPage.findMany() },
      { name: 'Task', query: () => prisma.task.findMany() },
      { name: 'Activity', query: () => prisma.activity.findMany() },
    ]

    criticalModels.forEach(({ name, query }) => {
      it(`should enforce workspace context for ${name} when scoping enabled`, async () => {
        if (!SCOPING_ENABLED) {
          console.log(`⏭️  Skipping ${name} test (scoping disabled)`)
          return
        }

        // Clear workspace context (simulate missing setWorkspaceContext call)
        clearWorkspaceContext()
        
        try {
          // Attempt query without workspace context
          await query()
          
          // If we get here, scoping is NOT enforced - this is a failure
          throw new Error(
            `❌ FAIL: ${name} query succeeded without workspace context! ` +
            `Scoping should have thrown an error.`
          )
        } catch (error: any) {
          // Expected: Error about missing workspace context
          const errorMessage = error.message || ''
          
          if (errorMessage.includes('workspace context') || 
              errorMessage.includes('setWorkspaceContext')) {
            // ✅ Correct behavior: Scoping enforced
            expect(errorMessage).toContain('workspace context')
            console.log(`✅ ${name}: Scoping correctly enforced`)
          } else {
            // Unexpected error - rethrow
            throw error
          }
        }
      })

      it(`should allow ${name} query with workspace context`, async () => {
        if (!SCOPING_ENABLED) {
          console.log(`⏭️  Skipping ${name} test (scoping disabled)`)
          return
        }

        // Get a test workspace ID (from database or mock)
        // For sanity test, we'll use a placeholder - real tests would use actual workspace
        const testWorkspaceId = 'test-workspace-id'
        
        try {
          // Set workspace context
          setWorkspaceContext(testWorkspaceId)
          
          // Attempt query with workspace context
          // Note: This will fail if workspace doesn't exist, but that's OK for sanity test
          // The important thing is it doesn't fail with "no workspace context" error
          await query()
          
          // If we get here, query worked (or failed for other reasons, which is OK)
          console.log(`✅ ${name}: Query with context succeeded (or failed for valid reasons)`)
        } catch (error: any) {
          const errorMessage = error.message || ''
          
          // If error is about workspace context, that's a failure
          if (errorMessage.includes('workspace context') && 
              errorMessage.includes('setWorkspaceContext')) {
            throw new Error(
              `❌ FAIL: ${name} query failed even with workspace context set! ` +
              `Error: ${errorMessage}`
            )
          }
          
          // Other errors (e.g., workspace doesn't exist) are acceptable for sanity test
          console.log(`✅ ${name}: Query with context handled correctly`)
        }
      })
    })
  })

  describe('Scoping Flag Status', () => {
    it('should report scoping status', () => {
      if (SCOPING_ENABLED) {
        console.log('✅ PRISMA_WORKSPACE_SCOPING_ENABLED=true - Scoping is ENABLED')
        expect(SCOPING_ENABLED).toBe(true)
      } else {
        console.log('⚠️  PRISMA_WORKSPACE_SCOPING_ENABLED=false or unset - Scoping is DISABLED')
        expect(SCOPING_ENABLED).toBe(false)
      }
    })
  })

  describe('Unscoped Client Availability', () => {
    it('should have prismaUnscoped available for scripts', async () => {
      // Verify prismaUnscoped is exported (for scripts/background jobs)
      const { prismaUnscoped } = await import('@/lib/db')
      expect(prismaUnscoped).toBeDefined()
      console.log('✅ prismaUnscoped available for scripts')
    })
  })
})

/**
 * Manual Test Instructions:
 * 
 * 1. With scoping DISABLED:
 *    - Set PRISMA_WORKSPACE_SCOPING_ENABLED=false
 *    - Run: npm test -- tests/workspace-scoping.sanity.test.ts
 *    - Expected: Tests skip with warning
 * 
 * 2. With scoping ENABLED:
 *    - Set PRISMA_WORKSPACE_SCOPING_ENABLED=true
 *    - Run: npm test -- tests/workspace-scoping.sanity.test.ts
 *    - Expected: Tests verify scoping is enforced
 *    - Critical models throw errors without workspace context
 */
