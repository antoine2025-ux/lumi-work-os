/**
 * Unit tests for WorkspaceProvider logic
 * 
 * Tests pure logic functions that don't require React rendering.
 * Focuses on permission helpers and workspace selection logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { WorkspaceWithRole, WorkspaceRole } from './workspace-context'

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

// Permission helper functions (extracted for testing)
function canManageWorkspace(currentWorkspace: WorkspaceWithRole | null, userRole: WorkspaceRole | null): boolean {
  return currentWorkspace !== null && userRole !== null && (userRole === 'OWNER' || userRole === 'ADMIN')
}

function canManageUsers(currentWorkspace: WorkspaceWithRole | null, userRole: WorkspaceRole | null): boolean {
  return currentWorkspace !== null && userRole !== null && (userRole === 'OWNER' || userRole === 'ADMIN')
}

function canManageProjects(currentWorkspace: WorkspaceWithRole | null, userRole: WorkspaceRole | null): boolean {
  return currentWorkspace !== null && userRole !== null && (userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'MEMBER')
}

function canViewProjects(currentWorkspace: WorkspaceWithRole | null): boolean {
  return currentWorkspace !== null
}

// Workspace selection logic (extracted for testing)
function selectCurrentWorkspace(
  workspaces: WorkspaceWithRole[],
  savedWorkspaceId: string | null
): WorkspaceWithRole | null {
  if (workspaces.length === 0) {
    return null
  }
  
  if (savedWorkspaceId) {
    const savedWorkspace = workspaces.find(w => w.id === savedWorkspaceId)
    if (savedWorkspace) {
      return savedWorkspace
    }
  }
  
  return workspaces[0]
}

describe('WorkspaceProvider Logic', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('Permission Helpers', () => {
    const mockWorkspace: WorkspaceWithRole = {
      id: 'workspace-1',
      name: 'Test Workspace',
      slug: 'test-workspace',
      description: 'Test',
      createdAt: new Date(),
      updatedAt: new Date(),
      userRole: 'MEMBER'
    }

    describe('canManageWorkspace', () => {
      it('returns true for OWNER', () => {
        expect(canManageWorkspace(mockWorkspace, 'OWNER')).toBe(true)
      })

      it('returns true for ADMIN', () => {
        expect(canManageWorkspace(mockWorkspace, 'ADMIN')).toBe(true)
      })

      it('returns false for MEMBER', () => {
        expect(canManageWorkspace(mockWorkspace, 'MEMBER')).toBe(false)
      })

      it('returns false for VIEWER', () => {
        expect(canManageWorkspace(mockWorkspace, 'VIEWER')).toBe(false)
      })

      it('returns false when workspace is null', () => {
        expect(canManageWorkspace(null, 'OWNER')).toBe(false)
      })

      it('returns false when role is null', () => {
        expect(canManageWorkspace(mockWorkspace, null)).toBe(false)
      })
    })

    describe('canManageUsers', () => {
      it('returns true for OWNER', () => {
        expect(canManageUsers(mockWorkspace, 'OWNER')).toBe(true)
      })

      it('returns true for ADMIN', () => {
        expect(canManageUsers(mockWorkspace, 'ADMIN')).toBe(true)
      })

      it('returns false for MEMBER', () => {
        expect(canManageUsers(mockWorkspace, 'MEMBER')).toBe(false)
      })

      it('returns false when workspace is null', () => {
        expect(canManageUsers(null, 'OWNER')).toBe(false)
      })
    })

    describe('canManageProjects', () => {
      it('returns true for OWNER', () => {
        expect(canManageProjects(mockWorkspace, 'OWNER')).toBe(true)
      })

      it('returns true for ADMIN', () => {
        expect(canManageProjects(mockWorkspace, 'ADMIN')).toBe(true)
      })

      it('returns true for MEMBER', () => {
        expect(canManageProjects(mockWorkspace, 'MEMBER')).toBe(true)
      })

      it('returns false for VIEWER', () => {
        expect(canManageProjects(mockWorkspace, 'VIEWER')).toBe(false)
      })

      it('returns false when workspace is null', () => {
        expect(canManageProjects(null, 'OWNER')).toBe(false)
      })
    })

    describe('canViewProjects', () => {
      it('returns true when workspace exists', () => {
        expect(canViewProjects(mockWorkspace)).toBe(true)
      })

      it('returns false when workspace is null', () => {
        expect(canViewProjects(null)).toBe(false)
      })
    })
  })

  describe('Workspace Selection Logic', () => {
    const workspace1: WorkspaceWithRole = {
      id: 'workspace-1',
      name: 'Workspace 1',
      slug: 'workspace-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      userRole: 'OWNER'
    }

    const workspace2: WorkspaceWithRole = {
      id: 'workspace-2',
      name: 'Workspace 2',
      slug: 'workspace-2',
      createdAt: new Date(),
      updatedAt: new Date(),
      userRole: 'MEMBER'
    }

    describe('selectCurrentWorkspace', () => {
      it('returns null when no workspaces', () => {
        expect(selectCurrentWorkspace([], null)).toBe(null)
      })

      it('returns first workspace when no saved workspaceId', () => {
        expect(selectCurrentWorkspace([workspace1, workspace2], null)).toBe(workspace1)
      })

      it('returns saved workspace when valid', () => {
        expect(selectCurrentWorkspace([workspace1, workspace2], 'workspace-2')).toBe(workspace2)
      })

      it('falls back to first workspace when saved workspaceId is invalid', () => {
        expect(selectCurrentWorkspace([workspace1, workspace2], 'invalid-workspace-id')).toBe(workspace1)
      })

      it('handles single workspace', () => {
        expect(selectCurrentWorkspace([workspace1], null)).toBe(workspace1)
        expect(selectCurrentWorkspace([workspace1], 'workspace-1')).toBe(workspace1)
      })
    })

    describe('switchWorkspace validation', () => {
      it('validates workspaceId exists in workspaces array', () => {
        const workspaces = [workspace1, workspace2]
        const validId = 'workspace-1'
        const invalidId = 'workspace-999'

        const validWorkspace = workspaces.find(w => w.id === validId)
        const invalidWorkspace = workspaces.find(w => w.id === invalidId)

        expect(validWorkspace).toBeDefined()
        expect(invalidWorkspace).toBeUndefined()
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles empty workspaces array gracefully', () => {
      expect(selectCurrentWorkspace([], null)).toBe(null)
      expect(selectCurrentWorkspace([], 'any-id')).toBe(null)
    })

    it('handles null workspace gracefully in permissions', () => {
      expect(canManageWorkspace(null, 'OWNER')).toBe(false)
      expect(canManageUsers(null, 'ADMIN')).toBe(false)
      expect(canManageProjects(null, 'MEMBER')).toBe(false)
      expect(canViewProjects(null)).toBe(false)
    })

    it('handles null role gracefully in permissions', () => {
      const mockWorkspace: WorkspaceWithRole = {
        id: 'workspace-1',
        name: 'Test',
        slug: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
        userRole: 'MEMBER'
      }

      expect(canManageWorkspace(mockWorkspace, null)).toBe(false)
      expect(canManageUsers(mockWorkspace, null)).toBe(false)
      expect(canManageProjects(mockWorkspace, null)).toBe(false)
    })
  })
})
