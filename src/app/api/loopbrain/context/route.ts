/**
 * Loopbrain Context Test API
 * 
 * Developer-only endpoint to inspect ContextEngine results.
 * Used for testing and debugging context retrieval.
 * 
 * No LLM, no embeddings - pure context inspection.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { contextEngine, getWorkspaceContextObjects } from '@/lib/loopbrain/context-engine'
import { ContextType } from '@/lib/loopbrain/context-types'
import { logger } from '@/lib/logger'

/**
 * GET /api/loopbrain/context
 * 
 * Query parameters:
 * - mode: "workspace" | "project" | "page" | "task" | "org" | "activity" | "unified"
 * - workspaceId: (optional, will use from auth if not provided)
 * - projectId: (required for project/unified mode)
 * - pageId: (required for page/unified mode)
 * - taskId: (required for task/unified mode)
 * - userId: (optional for unified mode)
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth context (preferred source for workspaceId)
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER']
    })

    // Use workspaceId from auth (preferred source)
    const workspaceId = auth.workspaceId

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') || 'workspace'
    const projectId = searchParams.get('projectId') || undefined
    const pageId = searchParams.get('pageId') || undefined
    const taskId = searchParams.get('taskId') || undefined
    const userId = searchParams.get('userId') || undefined
    const includeContextObjects = searchParams.get('includeContextObjects') === 'true'

    // Validate mode
    const validModes = ['workspace', 'project', 'page', 'task', 'org', 'activity', 'unified']
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { error: `Invalid mode. Must be one of: ${validModes.join(', ')}` },
        { status: 400 }
      )
    }

    // Route to appropriate context method
    let context

    switch (mode) {
      case 'workspace':
        context = await contextEngine.getWorkspaceContext(workspaceId)
        break

      case 'project':
        if (!projectId) {
          return NextResponse.json(
            { error: 'projectId is required for project mode' },
            { status: 400 }
          )
        }
        context = await contextEngine.getProjectContext(projectId, workspaceId)
        break

      case 'page':
        if (!pageId) {
          return NextResponse.json(
            { error: 'pageId is required for page mode' },
            { status: 400 }
          )
        }
        context = await contextEngine.getPageContext(pageId, workspaceId)
        break

      case 'task':
        if (!taskId) {
          return NextResponse.json(
            { error: 'taskId is required for task mode' },
            { status: 400 }
          )
        }
        context = await contextEngine.getTaskContext(taskId, workspaceId)
        break

      case 'org':
        context = await contextEngine.getOrgContext(workspaceId)
        break

      case 'activity':
        context = await contextEngine.getActivityContext(workspaceId)
        break

      case 'unified':
        // Unified context requires at least one anchor (projectId, pageId, or taskId)
        if (!projectId && !pageId && !taskId) {
          return NextResponse.json(
            { error: 'At least one of projectId, pageId, or taskId is required for unified mode' },
            { status: 400 }
          )
        }
        context = await contextEngine.getUnifiedContext({
          workspaceId,
          projectId,
          pageId,
          taskId,
          userId
        })
        break

      default:
        return NextResponse.json(
          { error: `Unhandled mode: ${mode}` },
          { status: 400 }
        )
    }

    // Handle not found
    if (!context) {
      return NextResponse.json(
        { error: 'Context not found' },
        { status: 404 }
      )
    }

    // Build response
    const response: {
      mode: string
      workspaceId: string
      context: typeof context
      contextObjects?: unknown[]
    } = {
      mode,
      workspaceId,
      context
    }

    // Optionally include unified ContextObjects
    if (includeContextObjects) {
      try {
        const contextObjects = await getWorkspaceContextObjects({
          workspaceId,
          userId: auth.user.userId,
          includeTasks: false, // Keep it simple for now
          limit: 20 // Limit to top 20 projects
        })
        response.contextObjects = contextObjects
      } catch (error) {
        logger.error('Error fetching ContextObjects for context API', {
          workspaceId,
          error
        })
        // Don't fail the request if ContextObjects fail to load
      }
    }

    // Return context
    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error in loopbrain context API', { error })

    // Handle auth errors
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
    }

    // Generic error
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


