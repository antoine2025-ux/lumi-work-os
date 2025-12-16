/**
 * Loopbrain Orchestrator
 * 
 * Central "Virtual COO" brain that coordinates:
 * - Context retrieval via ContextEngine
 * - Semantic search via EmbeddingService
 * - LLM calls via AI Providers
 * - Mode-specific prompt building
 * 
 * Rules:
 * - Keep it "dumb but clear" - simple, predictable flow
 * - Always scope by workspaceId (multi-tenant safety)
 * - Reuse existing AI providers (generateAIResponse)
 * - Explicit prompts with clear sections
 */

import { contextEngine, getWorkspaceContextObjects, getPersonalSpaceDocs, getOrgPeopleContext, getProjectContextObject, getEpicContextObject, getProjectEpicsContext, getProjectTasksContext } from './context-engine'
import { prisma } from '@/lib/db'
import { buildEpicContext, type EpicWithRelations } from './context-sources/pm/epics'
import { searchSimilarContextItems } from './embedding-service'
import { generateAIResponse } from '@/lib/ai/providers'
import { logger } from '@/lib/logger'
import {
  LoopbrainRequest,
  LoopbrainResponse,
  LoopbrainMode,
  LoopbrainContextSummary,
  LoopbrainSuggestion,
  RetrievedItem
} from './orchestrator-types'
import { ContextType } from './context-types'
import { isSlackAvailable, loopbrainSendSlackMessage, loopbrainReadSlackChannel } from './slack-helper'
import { ContextObject as UnifiedContextObject } from '@/lib/context/context-types'

/**
 * Default LLM model for Loopbrain
 */
const DEFAULT_LOOPBRAIN_MODEL = 'gpt-4-turbo'

/**
 * Main orchestrator function
 * 
 * @param req - Loopbrain request
 * @returns Loopbrain response
 */
export async function runLoopbrainQuery(
  req: LoopbrainRequest
): Promise<LoopbrainResponse> {
  const startTime = Date.now()
  
  logger.info('Loopbrain orchestrator started', {
    requestId: (req as any).requestId, // Passed from API route if available
    workspaceId: req.workspaceId,
    userId: req.userId,
    mode: req.mode,
    queryLength: req.query.length, // Log length, not content
  })

  try {
    // Route to mode-specific handler
    let result: LoopbrainResponse
    switch (req.mode) {
      case 'spaces':
        result = await handleSpacesMode(req)
        break
      case 'org':
        result = await handleOrgMode(req)
        break
      case 'dashboard':
        result = await handleDashboardMode(req)
        break
      default:
        throw new Error(`Unsupported Loopbrain mode: ${req.mode}`)
    }

    // Log completion
    const executionTimeMs = Date.now() - startTime
    logger.info('Loopbrain orchestrator completed', {
      requestId: (req as any).requestId,
      workspaceId: req.workspaceId,
      userId: req.userId,
      mode: req.mode,
      executionTimeMs,
      retrievedCount: result.metadata?.retrievedCount || 0,
    })

    return result
  } catch (error) {
    const executionTimeMs = Date.now() - startTime
    logger.error('Loopbrain orchestrator error', {
      requestId: (req as any).requestId,
      workspaceId: req.workspaceId,
      userId: req.userId,
      mode: req.mode,
      executionTimeMs,
    }, error)
    
    throw error
  }
}

/**
 * Handle Spaces mode
 * Focus: Projects, Pages, Tasks
 */
async function handleSpacesMode(
  req: LoopbrainRequest
): Promise<LoopbrainResponse> {
  // Check if Slack is available
  const slackAvailable = await isSlackAvailable(req.workspaceId)
  
  // Pre-process: If query explicitly requests sending to Slack, try to extract and send directly
  // Only if sendToSlack flag is set OR query has explicit Slack intent (slack + channel + send verb)
  const slackResult = await preprocessSlackRequest(req, slackAvailable)
  if (slackResult.sent) {
    // Message was sent successfully, return confirmation
    // But still allow main answer if user asked a question along with Slack send
    const hasQuestion = req.query.toLowerCase().includes('?') || 
                        req.query.toLowerCase().match(/\b(what|who|which|where|when|how|why|show|list|tell me|give me)\b/)
    
    if (hasQuestion && !req.sendToSlack) {
      // User asked a question, continue to generate answer
      // Slack was sent, but we'll still answer the question
    } else {
      // Pure Slack send request, return confirmation
      return {
        mode: 'spaces',
        workspaceId: req.workspaceId,
        userId: req.userId,
        query: req.query,
        context: { primaryContext: undefined, relatedContext: [], retrievedItems: [] },
        answer: slackResult.message || '✅ Message sent to Slack successfully!',
        suggestions: buildSpacesSuggestions(slackAvailable),
        metadata: {
          model: 'loopbrain-slack',
          retrievedCount: 0
        }
      }
    }
  }

  // Pre-process: If query is about reading Slack conversations, fetch and return them
  const slackReadResult = await preprocessSlackReadRequest(req, slackAvailable)
  if (slackReadResult.read) {
    // Messages were read, return them
    return {
      mode: 'spaces',
      workspaceId: req.workspaceId,
      userId: req.userId,
      query: req.query,
      context: { primaryContext: undefined, relatedContext: [], retrievedItems: [] },
      answer: slackReadResult.message || 'No messages found',
      suggestions: buildSpacesSuggestions(slackAvailable),
      metadata: {
        model: 'loopbrain-slack-read',
        retrievedCount: slackReadResult.messageCount || 0
      }
    }
  }
  
  // Load context
  const contextSummary = await loadSpacesContextForRequest(req)
  
  // Fetch structured ContextObjects (include tasks for blocked/at-risk analysis)
  try {
    const structuredContext = await getWorkspaceContextObjects({
      workspaceId: req.workspaceId,
      userId: req.userId,
      includeTasks: true, // Include tasks for blocked/at-risk analysis
      limit: 50 // Fetch more to get good coverage of projects and tasks
    })
    contextSummary.structuredContext = structuredContext
  } catch (error) {
    logger.error('Error fetching structured ContextObjects for Spaces mode', {
      workspaceId: req.workspaceId,
      error
    })
    // Don't fail the request if ContextObjects fail to load
  }

  // Fetch personal space documents
  try {
    const personalDocs = await getPersonalSpaceDocs({
      workspaceId: req.workspaceId,
      userId: req.userId,
      limit: 50
    })
    contextSummary.personalDocs = personalDocs
  } catch (error) {
    logger.error('Error fetching personal space docs for Spaces mode', {
      workspaceId: req.workspaceId,
      userId: req.userId,
      error
    })
    // Don't fail the request if personal docs fail to load
  }
  
  // Fetch Slack context if slackChannelHints are provided (Tier B - non-persistent)
  // Only fetch if question suggests Slack could help (e.g., "why is this blocked", "in Slack", mentions channel)
  if (slackAvailable && req.slackChannelHints && req.slackChannelHints.length > 0) {
    const shouldQuery = shouldQuerySlackForQuestion(req.query, req.slackChannelHints)
    
    if (shouldQuery) {
      try {
        const { getSlackContextForProject, deriveKeywordsFromUserQuestion } = await import('./context-sources/slack')
        
        // Extract project name from context
        let projectName: string | undefined
        if (contextSummary.primaryContext?.type === 'project') {
          projectName = contextSummary.primaryContext.name
        } else if (contextSummary.structuredContext) {
          const projectContext = contextSummary.structuredContext.find(ctx => ctx.type === 'project')
          if (projectContext) {
            projectName = projectContext.title
          }
        }
        
        // Extract task titles from context
        const taskTitles: string[] = []
        if (contextSummary.projectTasks && contextSummary.projectTasks.length > 0) {
          taskTitles.push(...contextSummary.projectTasks.map(t => t.title))
        } else if (contextSummary.structuredContext) {
          const taskContexts = contextSummary.structuredContext.filter(ctx => ctx.type === 'task')
          taskTitles.push(...taskContexts.map(t => t.title))
        }
        
        // Derive keywords from question, project name, and task titles
        const keywords = deriveKeywordsFromUserQuestion(req.query, projectName, taskTitles)
        
        const slackContext = await getSlackContextForProject({
          workspaceId: req.workspaceId,
          slackChannelHints: req.slackChannelHints,
          projectName,
          taskTitles: taskTitles.length > 0 ? taskTitles : undefined,
          keywords,
          maxMessagesPerChannel: 50
        })
        
        if (slackContext.length > 0) {
          contextSummary.slackContext = slackContext
          logger.info('Fetched Slack context for project', {
            workspaceId: req.workspaceId,
            projectId: req.projectId,
            projectName,
            taskCount: taskTitles.length,
            channelCount: slackContext.length,
            totalMessages: slackContext.reduce((sum, ch) => sum + ch.messageCount, 0),
            relevantMessages: slackContext.reduce((sum, ch) => sum + ch.messages.length, 0)
          })
        }
      } catch (error) {
        logger.warn('Failed to fetch Slack context for project', {
          workspaceId: req.workspaceId,
          projectId: req.projectId,
          error: error instanceof Error ? error.message : String(error)
        })
        // Don't fail the request if Slack context fails to load
      }
    }
  }
  
  // Build prompt (include Slack availability)
  const prompt = buildSpacesPrompt(req, contextSummary, slackAvailable)
  
  // Call LLM
  const llmResponse = await callLoopbrainLLM(prompt)
  
  // Check if LLM response contains Slack action requests and execute them
  // Only if explicitly requested or if LLM included Slack commands
  // This will replace [SLACK_READ:...] commands with actual messages
  const updatedContent = await handleSlackActions(req, llmResponse.content, slackAvailable, contextSummary)
  
  // Build suggestions
  const suggestions = buildSpacesSuggestions(slackAvailable)
  
  // Build response
  return {
    mode: 'spaces',
    workspaceId: req.workspaceId,
    userId: req.userId,
    query: req.query,
    context: contextSummary,
    answer: updatedContent,
    suggestions,
    metadata: {
      model: llmResponse.model,
      tokens: llmResponse.usage,
      retrievedCount: contextSummary.retrievedItems?.length || 0
    }
  }
}

/**
 * Determine if we should query Slack based on the user's question
 * Returns true if question suggests Slack could help (mentions Slack, blocked issues, specific channels, etc.)
 */
function shouldQuerySlackForQuestion(question: string, slackChannelHints: string[]): boolean {
  const lowerQuestion = question.toLowerCase()
  
  // Explicit Slack mentions
  const slackMentions = ['slack', 'in slack', 'on slack', 'check slack', 'look in slack', 'mentioned in']
  if (slackMentions.some(mention => lowerQuestion.includes(mention))) {
    return true
  }
  
  // Problem/blocker indicators that might be discussed in Slack
  const problemIndicators = [
    'why is', 'why are', 'why did', 'why does',
    'blocked', 'block', 'stuck', 'cannot', "can't", 'unable',
    'issue', 'problem', 'error', 'bug', 'broken', 'fail',
    'discussion', 'conversation', 'chat', 'message', 'talked about'
  ]
  if (problemIndicators.some(indicator => lowerQuestion.includes(indicator))) {
    return true
  }
  
  // Check if question mentions any of the project's Slack channels
  const channelMentions = slackChannelHints.map(hint => {
    const channelName = hint.replace(/^#/, '').toLowerCase()
    return lowerQuestion.includes(channelName) || lowerQuestion.includes(`#${channelName}`)
  })
  if (channelMentions.some(mentioned => mentioned)) {
    return true
  }
  
  // Questions asking about communication or updates
  const communicationIndicators = [
    'anyone say', 'anyone mention', 'anyone discuss', 'anyone talk',
    'what did', 'what are', 'what is', 'what was',
    'find out', 'check if', 'see if', 'look for'
  ]
  if (communicationIndicators.some(indicator => lowerQuestion.includes(indicator))) {
    return true
  }
  
  return false
}

/**
 * Handle Org mode
 * Focus: Teams, Roles, Hierarchy
 */
async function handleOrgMode(
  req: LoopbrainRequest
): Promise<LoopbrainResponse> {
  // Check if Slack is available
  const slackAvailable = await isSlackAvailable(req.workspaceId)
  
  // Pre-process: If query is about sending to Slack, try to extract and send directly
  const slackResult = await preprocessSlackRequest(req, slackAvailable)
  if (slackResult.sent) {
    return {
      mode: 'org',
      workspaceId: req.workspaceId,
      userId: req.userId,
      query: req.query,
      context: { primaryContext: undefined, relatedContext: [], retrievedItems: [] },
      answer: slackResult.message || '✅ Message sent to Slack successfully!',
      suggestions: buildOrgSuggestions(slackAvailable),
      metadata: {
        model: 'loopbrain-slack',
        retrievedCount: 0
      }
    }
  }

  // Pre-process: If query is about reading Slack conversations, fetch and return them
  const slackReadResult = await preprocessSlackReadRequest(req, slackAvailable)
  if (slackReadResult.read) {
    return {
      mode: 'org',
      workspaceId: req.workspaceId,
      userId: req.userId,
      query: req.query,
      context: { primaryContext: undefined, relatedContext: [], retrievedItems: [] },
      answer: slackReadResult.message || 'No messages found',
      suggestions: buildOrgSuggestions(slackAvailable),
      metadata: {
        model: 'loopbrain-slack-read',
        retrievedCount: slackReadResult.messageCount || 0
      }
    }
  }
  
  // Load context
  const contextSummary = await loadOrgContextForRequest(req)
  
  // Fetch organization people (users with their roles)
  try {
    const orgPeople = await getOrgPeopleContext({
      workspaceId: req.workspaceId,
      limit: 100
    })
    contextSummary.orgPeople = orgPeople
  } catch (error) {
    logger.error('Error fetching org people for Org mode', {
      workspaceId: req.workspaceId,
      error
    })
    // Don't fail the request if org people fail to load
  }
  
  // Build prompt (include Slack availability)
  const prompt = buildOrgPrompt(req, contextSummary, slackAvailable)
  
  // Call LLM
  const llmResponse = await callLoopbrainLLM(prompt)
  
  // Check if LLM response contains Slack action requests and execute them
  // Only if explicitly requested or if LLM included Slack commands
  // This will replace [SLACK_READ:...] commands with actual messages
  const updatedContent = await handleSlackActions(req, llmResponse.content, slackAvailable, contextSummary)
  
  // Build suggestions
  const suggestions = buildOrgSuggestions(slackAvailable)
  
  // Build response
  return {
    mode: 'org',
    workspaceId: req.workspaceId,
    userId: req.userId,
    query: req.query,
    context: contextSummary,
    answer: updatedContent,
    suggestions,
    metadata: {
      model: llmResponse.model,
      tokens: llmResponse.usage,
      retrievedCount: contextSummary.retrievedItems?.length || 0
    }
  }
}

/**
 * Handle Dashboard mode
 * Focus: Workspace overview, Activity
 */
async function handleDashboardMode(
  req: LoopbrainRequest
): Promise<LoopbrainResponse> {
  // Check if Slack is available
  const slackAvailable = await isSlackAvailable(req.workspaceId)
  
  // Pre-process: If query is about sending to Slack, try to extract and send directly
  const slackResult = await preprocessSlackRequest(req, slackAvailable)
  if (slackResult.sent) {
    return {
      mode: 'dashboard',
      workspaceId: req.workspaceId,
      userId: req.userId,
      query: req.query,
      context: { primaryContext: undefined, relatedContext: [], retrievedItems: [] },
      answer: slackResult.message || '✅ Message sent to Slack successfully!',
      suggestions: buildDashboardSuggestions(slackAvailable),
      metadata: {
        model: 'loopbrain-slack',
        retrievedCount: 0
      }
    }
  }

  // Pre-process: If query is about reading Slack conversations, fetch and return them
  const slackReadResult = await preprocessSlackReadRequest(req, slackAvailable)
  if (slackReadResult.read) {
    return {
      mode: 'dashboard',
      workspaceId: req.workspaceId,
      userId: req.userId,
      query: req.query,
      context: { primaryContext: undefined, relatedContext: [], retrievedItems: [] },
      answer: slackReadResult.message || 'No messages found',
      suggestions: buildDashboardSuggestions(slackAvailable),
      metadata: {
        model: 'loopbrain-slack-read',
        retrievedCount: slackReadResult.messageCount || 0
      }
    }
  }
  
  // Load context
  const contextSummary = await loadDashboardContextForRequest(req)
  
  // Build prompt (include Slack availability)
  const prompt = buildDashboardPrompt(req, contextSummary, slackAvailable)
  
  // Call LLM
  const llmResponse = await callLoopbrainLLM(prompt)
  
  // Check if LLM response contains Slack action requests and execute them
  // Only if explicitly requested or if LLM included Slack commands
  // This will replace [SLACK_READ:...] commands with actual messages
  const updatedContent = await handleSlackActions(req, llmResponse.content, slackAvailable, contextSummary)
  
  // Build suggestions
  const suggestions = buildDashboardSuggestions(slackAvailable)
  
  // Build response
  return {
    mode: 'dashboard',
    workspaceId: req.workspaceId,
    userId: req.userId,
    query: req.query,
    context: contextSummary,
    answer: updatedContent,
    suggestions,
    metadata: {
      model: llmResponse.model,
      tokens: llmResponse.usage,
      retrievedCount: contextSummary.retrievedItems?.length || 0
    }
  }
}

/**
 * Load context for Spaces mode
 */
async function loadSpacesContextForRequest(
  req: LoopbrainRequest
): Promise<LoopbrainContextSummary> {
  const summary: LoopbrainContextSummary = {}

  // Load primary context based on anchors
  if (req.pageId) {
    const pageContext = await contextEngine.getPageContext(
      req.pageId,
      req.workspaceId
    )
    if (pageContext) {
      summary.primaryContext = pageContext
    }
  } else if (req.projectId) {
    // Try to get UnifiedContextObject first (from store)
    const projectContextObject = await getProjectContextObject(
      req.projectId,
      req.workspaceId
    )
    
    // Also get ProjectContext for primary context (Loopbrain format)
    const projectContext = await contextEngine.getProjectContext(
      req.projectId,
      req.workspaceId
    )
    if (projectContext) {
      summary.primaryContext = projectContext
    }
    
    // Merge project slackChannelHints into request (if project has them)
    // This allows projects to specify channels that Loopbrain should check
    try {
      const project = await prisma.project.findUnique({
        where: { id: req.projectId, workspaceId: req.workspaceId },
        select: { id: true } // We don't persist slackChannelHints, but check if project exists
      })
      // Note: slackChannelHints come from request body (not persisted in DB)
      // They should already be in req.slackChannelHints from the API route
    } catch (err) {
      // Ignore errors - project might not exist or slackChannelHints not available
    }
    
    // Add UnifiedContextObject to structured context if available
    if (projectContextObject && summary.structuredContext) {
      // Check if it's already in the list
      const exists = summary.structuredContext.some(obj => obj.id === projectContextObject.id)
      if (!exists) {
        summary.structuredContext = [projectContextObject, ...summary.structuredContext]
      }
    } else if (projectContextObject) {
      summary.structuredContext = [projectContextObject]
    }

    // Inline-load epics directly via Prisma (temporary fix to unblock Loopbrain)
    // TODO: Refactor back to getProjectEpicsContext once verified working
    try {
      const epics = await prisma.epic.findMany({
        where: { projectId: req.projectId },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              tasks: true
            }
          },
          tasks: {
            select: {
              status: true
            }
          }
        },
        orderBy: { order: 'asc' }
      })

      // Build epic contexts using buildEpicContext
      const epicContexts: UnifiedContextObject[] = epics.map(epic => 
        buildEpicContext(epic as EpicWithRelations)
      )

      summary.projectEpics = epicContexts

      // Also add epics to structuredContext if not already present
      if (epicContexts.length > 0) {
        if (!summary.structuredContext) {
          summary.structuredContext = []
        }
        // Add epics that aren't already in structuredContext
        for (const epic of epicContexts) {
          const exists = summary.structuredContext.some(obj => obj.id === epic.id)
          if (!exists) {
            summary.structuredContext.push(epic)
          }
        }
      }

    } catch (err) {
      console.error('[LB-EPIC] Failed to inline-load project epics:', err)
      // Fallback to helper if inline load fails
      try {
        const projectEpics = await getProjectEpicsContext(
          req.projectId,
          req.workspaceId
        )
        summary.projectEpics = projectEpics
        if (projectEpics.length > 0 && summary.structuredContext) {
          for (const epic of projectEpics) {
            const exists = summary.structuredContext.some(obj => obj.id === epic.id)
            if (!exists) {
              summary.structuredContext.push(epic)
            }
          }
        }
      } catch (fallbackErr) {
        console.error('[LB-EPIC] Fallback to getProjectEpicsContext also failed:', fallbackErr)
      }
    }
  } else if (req.taskId) {
    const taskContext = await contextEngine.getTaskContext(
      req.taskId,
      req.workspaceId
    )
    if (taskContext) {
      summary.primaryContext = taskContext
    }
  } else if (req.epicId) {
    // Try to get UnifiedContextObject for epic (from store)
    const epicContextObject = await getEpicContextObject(
      req.epicId,
      req.workspaceId
    )
    
    // Add UnifiedContextObject to structured context if available
    if (epicContextObject) {
      if (summary.structuredContext) {
        // Check if it's already in the list
        const exists = summary.structuredContext.some(obj => obj.id === epicContextObject.id)
        if (!exists) {
          summary.structuredContext.push(epicContextObject)
        }
      } else {
        summary.structuredContext = [epicContextObject]
      }
    }
  }

  // If no primary context from anchors, use unified context or workspace
  if (!summary.primaryContext) {
    if (req.projectId || req.pageId || req.taskId || req.epicId) {
      const unifiedContext = await contextEngine.getUnifiedContext({
        workspaceId: req.workspaceId,
        projectId: req.projectId,
        pageId: req.pageId,
        taskId: req.taskId
      })
      if (unifiedContext) {
        summary.primaryContext = unifiedContext
      }
    } else {
      // Fallback to workspace context
      const workspaceContext = await contextEngine.getWorkspaceContext(
        req.workspaceId
      )
      if (workspaceContext) {
        summary.primaryContext = workspaceContext
      }
    }
  }


  // Optional semantic search
  if (req.useSemanticSearch !== false) {
    try {
      const searchResults = await searchSimilarContextItems({
        workspaceId: req.workspaceId,
        query: req.query,
        limit: req.maxContextItems || 10
      })

      summary.retrievedItems = searchResults.map(result => ({
        contextItemId: result.contextItemId,
        contextId: result.contextId,
        type: result.type,
        title: result.title,
        score: result.score
      }))
    } catch (error) {
      logger.error('Semantic search failed in Spaces mode', {
        workspaceId: req.workspaceId,
        error
      })
      // Continue without semantic search results
    }
  }

  return summary
}

/**
 * Load context for Org mode
 */
async function loadOrgContextForRequest(
  req: LoopbrainRequest
): Promise<LoopbrainContextSummary> {
  const summary: LoopbrainContextSummary = {}

  // Load org context
  const orgContext = await contextEngine.getOrgContext(req.workspaceId)
  if (orgContext) {
    summary.primaryContext = orgContext
  }

  // Optional semantic search (filter by org type)
  if (req.useSemanticSearch !== false) {
    try {
      const searchResults = await searchSimilarContextItems({
        workspaceId: req.workspaceId,
        query: req.query,
        type: ContextType.ORG,
        limit: req.maxContextItems || 10
      })

      summary.retrievedItems = searchResults.map(result => ({
        contextItemId: result.contextItemId,
        contextId: result.contextId,
        type: result.type,
        title: result.title,
        score: result.score
      }))
    } catch (error) {
      logger.error('Semantic search failed in Org mode', {
        workspaceId: req.workspaceId,
        error
      })
    }
  }

  return summary
}

/**
 * Load context for Dashboard mode
 */
async function loadDashboardContextForRequest(
  req: LoopbrainRequest
): Promise<LoopbrainContextSummary> {
  const summary: LoopbrainContextSummary = {}

  // Load workspace context
  const workspaceContext = await contextEngine.getWorkspaceContext(
    req.workspaceId
  )
  if (workspaceContext) {
    summary.primaryContext = workspaceContext
  }

  // Load activity context
  const activityContext = await contextEngine.getActivityContext(
    req.workspaceId
  )
  if (activityContext) {
    summary.relatedContext = [activityContext]
  }

  // Optional semantic search
  if (req.useSemanticSearch !== false) {
    try {
      const searchResults = await searchSimilarContextItems({
        workspaceId: req.workspaceId,
        query: req.query,
        limit: req.maxContextItems || 10
      })

      summary.retrievedItems = searchResults.map(result => ({
        contextItemId: result.contextItemId,
        contextId: result.contextId,
        type: result.type,
        title: result.title,
        score: result.score
      }))
    } catch (error) {
      logger.error('Semantic search failed in Dashboard mode', {
        workspaceId: req.workspaceId,
        error
      })
    }
  }

  return summary
}

/**
 * Build prompt for Spaces mode
 */
function buildSpacesPrompt(
  req: LoopbrainRequest,
  ctx: LoopbrainContextSummary,
  slackAvailable: boolean = false
): string {
  const sections: string[] = []

  // System guidance
  sections.push(`You are Loopbrain, Loopwell's Virtual COO assistant operating in Spaces mode.
Your role is to help users manage projects, pages, and tasks within their workspace.
You have access to contextual information about their workspace, projects, pages, and tasks.
Be helpful, concise, and action-oriented.`)

  // ContextObject usage instructions (add before Structured Context Objects section)
  if (ctx.structuredContext && ctx.structuredContext.length > 0) {
    const projectContextSlice = filterProjectContextObjects(ctx.structuredContext)
    
    if (projectContextSlice.length > 0) {
      sections.push(`\n## CRITICAL: Using Structured Context Objects for Project Questions

When answering questions about projects, tasks, or workspace status, you MUST use the data in the "Structured Context Objects" section as your primary source of truth. Do not invent projects or statuses that are not present there.

### Project Listing Behavior

If the user asks "what projects am I working on", "what projects are active", "which projects are blocked", or similar questions, you MUST:

1. **Filter ContextObjects** where:
   - type === 'project'
   - status is NOT 'archived' (unless the user explicitly asks for archived/completed projects)

2. **For each project, include at minimum:**
   - Project title (from the 'title' field)
   - Status (from the 'status' field)
   - Owner (if available in 'ownerId' or relations with label 'owner')
   - Optionally: department, team, or priority (if available in 'metadata' or 'tags')

3. **Format your response** with a clear heading and structured list, for example:

   **Projects you're working on:**
   - Project Alpha — status: active — owner: Jane Doe — department: Engineering
   - Project Beta — status: in-progress — owner: John Smith — priority: high

4. **Honesty rule:** If there are no matching projects in the ContextObjects, say so clearly instead of guessing. For example: "I don't see any active projects in your workspace right now."

### Blocked and At-Risk Project Questions

When the user asks about "blocked projects", "at-risk projects", "delayed projects", or "what's blocking Project X", you MUST:

1. **Interpret 'blocked'** using tasks whose:
   - Status is 'blocked', OR
   - Tags contain 'blocked', 'stuck', 'waiting', or 'dependency'

2. **Interpret 'at risk'** using:
   - Tasks with overdue due dates (check metadata.dueDate vs current date), OR
   - Projects with many incomplete tasks (>5), OR
   - Project status or tags indicating 'delayed', 'behind', or 'at-risk'

3. **For each blocked/at-risk project, you MUST:**
   - Name the project explicitly
   - Mention the specific blocking/overdue tasks that led to that classification
   - Example: "Project Alpha is blocked because Task X has status 'blocked'" or "Project Beta is at risk because 3 tasks are overdue"

4. **Use only the project and task ContextObjects** provided in the 'Structured Context Objects' section as your source of truth. Do not invent blocking issues.

5. **Honesty rule for blocked/at-risk:** If there are no tasks or no evidence of blocking/at-risk status in the ContextObjects, explicitly say so. For example: "I don't see any blocked projects in your workspace. All active projects appear to be progressing normally."

6. **Optional suggestions:** After stating the facts, you may suggest next steps (e.g., "You may want to follow up with the task owner", "Consider updating the task status"), but always clearly separate facts from suggestions.

The workspace currently has ${projectContextSlice.length} active project(s) listed in the Structured Context Objects section below.`)
    }
  }

  // Slack integration info - only mention if explicitly requested or for Slack-specific queries
  if (slackAvailable && (req.sendToSlack || req.query.toLowerCase().includes('slack'))) {
    sections.push(`\n## Slack Integration Available

The workspace has Slack connected. You can send messages to Slack channels or read messages from channels.

### IMPORTANT: When to Use Slack

**ONLY use Slack when:**
- The user explicitly asks to send something to Slack (e.g., "send this to #general", "post to Slack")
- The user explicitly asks to read Slack messages (e.g., "read messages from #dev")
- The user's query contains both "slack" AND a channel reference (#channel-name) AND a send/read verb

**DO NOT use Slack for:**
- General informational questions (e.g., "what documents exist", "who works here", "what projects are active")
- Questions that don't mention Slack explicitly
- Questions that are just asking for information without requesting a Slack action

### Sending Messages to Slack

When the user explicitly asks you to send a message to Slack, you MUST:
1. Extract the channel name (e.g., #general, #loopwell-dev)
2. Extract the ACTUAL MESSAGE CONTENT (not the instruction text)
3. Include this EXACT format in your response: [SLACK_SEND:channel=#channel-name:text=Your message here]

IMPORTANT RULES:
- ONLY use [SLACK_SEND:...] when the user explicitly requests sending to Slack
- Channel names should start with # (e.g., #general)
- Extract the actual message content, not instruction text
- If the user's question is informational (e.g., "what documents exist"), DO NOT include [SLACK_SEND:...] - just answer the question

Examples:
- User: "send a message to #general saying hello" → Include [SLACK_SEND:channel=#general:text=hello]
- User: "what documents exist in my personal space" → DO NOT include [SLACK_SEND:...], just list the documents

### Reading Messages from Slack

When the user explicitly asks to read Slack messages:
1. Extract the channel name (e.g., #general, #loopwell-dev)
2. Include this format: [SLACK_READ:channel=#channel-name:limit=50]

Examples:
- User: "read messages from #general" → Include [SLACK_READ:channel=#general:limit=50]
- User: "what documents exist" → DO NOT include [SLACK_READ:...], just answer the question

The system will automatically execute [SLACK_SEND:...] and [SLACK_READ:...] commands if they are present.`)
  }

  // Primary context
  if (ctx.primaryContext) {
    sections.push(`\n## Primary Context:`)
    sections.push(formatContextObject(ctx.primaryContext))
    
    // Add relevant communication channels if available from client metadata
    if (ctx.primaryContext.type === 'project' && req.clientMetadata?.projectSlackHints) {
      const channels = req.clientMetadata.projectSlackHints as string[]
      if (Array.isArray(channels) && channels.length > 0) {
        sections.push(`\n### Relevant Communication Channels`)
        sections.push(`These are the channels typically associated with this project: ${channels.map((c: string) => `#${c.replace(/^#/, '')}`).join(', ')}`)
        sections.push(`When answering questions such as "why is this task blocked?", you may use these channels as references for where relevant discussions may have occurred.`)
        sections.push(`⚠️ Do NOT say "I checked Slack" — just use information naturally.`)
      }
    }
  }

  // Related items from semantic search
  if (ctx.retrievedItems && ctx.retrievedItems.length > 0) {
    sections.push(`\n## Related Items:`)
    ctx.retrievedItems.forEach(item => {
      sections.push(`- ${item.title} (${item.type})${item.score ? ` [relevance: ${item.score.toFixed(2)}]` : ''}`)
    })
  }

  // Epics for the current project (if projectId is present)
  if (ctx.projectEpics && ctx.projectEpics.length > 0) {
    sections.push(`\n## EPICS IN THIS PROJECT:`)
    sections.push(`You know the project's epics from the EPICS IN THIS PROJECT (JSON) section below. When the user asks things like "which epics exist in this project?" or "list the epics in this project", you MUST answer by listing those epics by name, along with status and any relevant details from the JSON. Do NOT say that there are no epics if this section is non-empty.`)
    sections.push(`\nEPICS IN THIS PROJECT (JSON):`)
    sections.push(`\`\`\`json`)
    
    const epicsData = ctx.projectEpics.map(epic => ({
      id: epic.metadata?.id || epic.id,
      title: epic.title,
      status: epic.status,
      description: epic.metadata?.description || undefined,
      tasksTotal: epic.metadata?.tasksTotal || 0,
      tasksDone: epic.metadata?.tasksDone || 0,
      order: epic.metadata?.order || undefined
    }))
    
    sections.push(JSON.stringify(epicsData, null, 2))
    sections.push(`\`\`\``)
  }

  // Tasks for the current project (if projectId is present)
  if (ctx.projectTasks && ctx.projectTasks.length > 0) {
    sections.push(`\n## TASKS IN THIS PROJECT:`)
    sections.push(`These are all tasks related to the current project. Use them to answer questions about blocked tasks, tasks by status, tasks in a given epic, tasks assigned to a user, and tasks due soon. When the user asks about tasks (e.g., "which tasks are blocked?", "what tasks are in epic X?"), you MUST use TASKS IN THIS PROJECT (JSON). Do NOT say tasks are unavailable if this section contains tasks.`)
    sections.push(`\nTASKS IN THIS PROJECT (JSON):`)
    sections.push(`\`\`\`json`)
    
    const tasksData = ctx.projectTasks.map(task => ({
      id: task.metadata?.id || task.id,
      title: task.title,
      status: task.status,
      priority: task.metadata?.priority || undefined,
      description: task.metadata?.description || undefined,
      epicId: task.metadata?.epicId || undefined,
      epicTitle: task.metadata?.epicTitle || undefined,
      assigneeId: task.metadata?.assigneeId || undefined,
      dueDate: task.metadata?.dueDate || undefined,
      subtaskCount: task.metadata?.subtaskCount || 0,
      subtaskDoneCount: task.metadata?.subtaskDoneCount || 0
    }))
    
    sections.push(JSON.stringify(tasksData, null, 2))
    sections.push(`\`\`\``)
  }

  // Instructions for joining epics and tasks
  if ((ctx.projectEpics && ctx.projectEpics.length > 0) && (ctx.projectTasks && ctx.projectTasks.length > 0)) {
    sections.push(`\n### How to reason about epics and tasks:`)
    sections.push(`- **EPICS IN THIS PROJECT (JSON)** contains epics, each with an \`id\` and \`title\`.`)
    sections.push(`- **TASKS IN THIS PROJECT (JSON)** contains tasks.`)
    sections.push(`- Each task may have:`)
    sections.push(`  - \`epicId\`: the id of the epic it belongs to (matches an epic's \`id\`).`)
    sections.push(`  - \`epicTitle\`: the title of the epic it belongs to (matches an epic's \`title\`).`)
    sections.push(`- Use these fields to answer questions like:`)
    sections.push(`  - "Which tasks belong to epic X?"`)
    sections.push(`  - "Are these tasks related to an epic?"`)
    sections.push(`  - "Which blocked tasks belong to the epic Y?"`)
    sections.push(`\nWhen the user asks about tasks in a specific epic, you MUST:`)
    sections.push(`1. Identify the epic by name using EPICS IN THIS PROJECT (JSON).`)
    sections.push(`2. Find tasks whose \`epicId\` or \`epicTitle\` match that epic.`)
    sections.push(`3. Answer using those tasks. Do NOT say there is no relationship if these fields are present.`)
  }

  // Project Documentation (if available in project context)
  if (ctx.primaryContext?.type === 'project' || (ctx.structuredContext && ctx.structuredContext.some(obj => obj.type === 'project'))) {
    const projectContext = ctx.primaryContext?.type === 'project' 
      ? ctx.primaryContext 
      : ctx.structuredContext?.find(obj => obj.type === 'project')
    
    if (projectContext?.metadata?.documentation && Array.isArray(projectContext.metadata.documentation) && projectContext.metadata.documentation.length > 0) {
      sections.push(`\n## PROJECT DOCUMENTATION:`)
      sections.push(`The project has attached documentation pages listed below. Use these to answer questions about where detailed specs or docs for this project live. If the user asks for documentation, reference these pages.`)
      sections.push(`\nPROJECT DOCUMENTATION (JSON):`)
      sections.push(`\`\`\`json`)
      // Include full content for each documentation page (already processed with grouped code blocks)
      const docsWithContent = projectContext.metadata.documentation.map((doc: any) => ({
        id: doc.id,
        wikiPageId: doc.wikiPageId,
        title: doc.title,
        slug: doc.slug,
        workspaceType: doc.workspaceType,
        updatedAt: doc.updatedAt,
        content: doc.content || undefined // Include full content if available
      }))
      sections.push(JSON.stringify(docsWithContent, null, 2))
      sections.push(`\`\`\``)
      sections.push(`\nWhen the user asks:`)
      sections.push(`- "What documentation is linked to this project?"`)
      sections.push(`- "Where can I find the specs for this project?"`)
      sections.push(`- "What docs are attached to this project?"`)
      sections.push(`- "Describe the architecture diagram in the documentation"`)
      sections.push(`you MUST list the documentation pages from the PROJECT DOCUMENTATION (JSON) section above, including their titles and workspace types (Personal, Team, or custom space names).`)
      sections.push(`\n**IMPORTANT:** Each documentation entry includes its full content (with code/ASCII blocks already merged). When answering questions about diagrams, architecture, or detailed specs, use the complete content from the \`content\` field, not just the title.`)
    }
  }

  // Slack Discussions (Tier B - non-persistent context from project channels)
  if (ctx.slackContext && ctx.slackContext.length > 0) {
    sections.push(`\n## SLACK DISCUSSIONS (PROJECT-RELATED):`)
    sections.push(`Below is a summary of Slack conversations from channels the project declared as relevant.`)
    sections.push(`Use this information when answering questions about blockers, root causes, decisions, or alignment issues.`)
    sections.push(`\nIf a user asks:`)
    sections.push(`- "Why is this task blocked?"`)
    sections.push(`- "Any Slack mention of this issue?"`)
    sections.push(`- "Is anyone discussing this problem?"`)
    sections.push(`- "What are people saying about this in Slack?"`)
    sections.push(`you MUST inspect this Slack JSON.`)
    sections.push(`\nSLACK DISCUSSIONS (JSON):`)
    sections.push(`\`\`\`json`)
    
    const slackData = ctx.slackContext.map(channel => ({
      channel: channel.channel,
      relevance: channel.relevance,
      summary: channel.summary,
      messageCount: channel.messageCount,
      messages: channel.messages.slice(0, 20) // Limit to 20 most recent messages per channel
    }))
    
    sections.push(JSON.stringify(slackData, null, 2))
    sections.push(`\`\`\``)
  }

  // Structured ContextObjects (unified format)
  if (ctx.structuredContext && ctx.structuredContext.length > 0) {
    // Filter projects and tasks for better focus
    const projectContextSlice = filterProjectContextObjects(ctx.structuredContext).slice(0, 10)
    const taskContextSlice = filterTaskContextObjects(ctx.structuredContext).slice(0, 30) // Limit to 30 tasks for analysis
    
    // Combine projects and tasks, prioritizing projects
    const relevantContext = [...projectContextSlice, ...taskContextSlice]
    
    if (relevantContext.length > 0) {
      sections.push(`\n## Structured Context Objects (JSON, ${projectContextSlice.length} active projects, ${taskContextSlice.length} active tasks):`)
      sections.push(`The following structured context objects represent key entities in the workspace. This includes both projects and tasks. Use this as your primary source of truth for project and task information, including blocked/at-risk analysis.`)
      sections.push(`\n\`\`\`json`)
      
      // Include relevant fields based on type
      const simplifiedContext = relevantContext.map(obj => {
        const base = {
          id: obj.id,
          type: obj.type,
          title: obj.title,
          summary: obj.summary,
          status: obj.status,
          tags: obj.tags.slice(0, 5), // Limit tags
        }
        
        // Add type-specific fields
        if (obj.type === 'project') {
          return {
            ...base,
            ownerId: obj.ownerId || undefined,
            metadata: {
              department: obj.metadata?.department || undefined,
              team: obj.metadata?.team || undefined,
              priority: obj.metadata?.priority || undefined,
            },
            relations: obj.relations
              .filter(rel => rel.type === 'person' && rel.label === 'owner')
              .map(rel => ({
                type: rel.type,
                id: rel.id,
                label: rel.label
              }))
          }
        } else if (obj.type === 'task') {
          return {
            ...base,
            ownerId: obj.ownerId || undefined,
            metadata: {
              dueDate: obj.metadata?.dueDate || undefined,
              priority: obj.metadata?.priority || undefined,
            },
            relations: obj.relations
              .filter(rel => rel.type === 'project' || (rel.type === 'person' && rel.label === 'assignee'))
              .map(rel => ({
                type: rel.type,
                id: rel.id,
                label: rel.label
              }))
          }
        }
        
        return base
      })
      
      sections.push(JSON.stringify(simplifiedContext, null, 2))
      sections.push(`\`\`\``)
      sections.push(`\n**Important:** This is a filtered view showing only active projects (excluding archived) and active tasks (excluding completed). Use the data above to answer project-related questions accurately, including identifying blocked or at-risk projects based on task status, tags, and due dates.`)
    }
  }

  // Personal Docs ContextObjects (user's personal space pages)
  if (ctx.personalDocs && ctx.personalDocs.length > 0) {
    const personalDocsSlice = ctx.personalDocs.slice(0, 20) // Limit to top 20
    
    sections.push(`\n## Personal Docs ContextObjects (JSON, ${ctx.personalDocs.length} total, showing top ${personalDocsSlice.length}):`)
    sections.push(`The following structured context objects represent documents in the user's personal space. When the user asks about documents in their personal space, use this data to list the documents by title and include basic metadata (e.g. category, last updated).`)
    sections.push(`\n\`\`\`json`)
    
    const simplifiedPersonalDocs = personalDocsSlice.map(obj => ({
      id: obj.id,
      type: obj.type,
      title: obj.title,
      summary: obj.summary,
      status: obj.status,
      tags: obj.tags.slice(0, 5), // Limit tags
      ownerId: obj.ownerId,
      updatedAt: obj.updatedAt.toISOString(),
      metadata: {
        category: obj.metadata?.category || undefined,
        slug: obj.metadata?.slug || undefined,
        viewCount: obj.metadata?.viewCount || undefined
      }
    }))
    
    sections.push(JSON.stringify(simplifiedPersonalDocs, null, 2))
    sections.push(`\`\`\``)
    sections.push(`\n**Instructions for personal docs questions:**`)
    sections.push(`- When the user asks "what documents exist in my personal space", "show me my personal docs", or similar questions, you MUST list the documents from the Personal Docs ContextObjects above.`)
    sections.push(`- For each document, include: title, category (if available), and last updated date.`)
    sections.push(`- Format as a clear list, for example:`)
    sections.push(`  **Documents in your personal space:**`)
    sections.push(`  - Document Title 1 — category: general — updated: 2024-01-15`)
    sections.push(`  - Document Title 2 — category: notes — updated: 2024-01-10`)
    sections.push(`- If there are no personal docs, say so clearly: "You don't have any documents in your personal space yet."`)
    sections.push(`- Do NOT use Slack for these queries - just list the documents directly.`)
  } else {
    // Even if there are no personal docs, add a note so the LLM knows to check
    sections.push(`\n## Personal Docs ContextObjects:`)
    sections.push(`The user has 0 documents in their personal space. If they ask about personal documents, inform them that their personal space is currently empty.`)
  }

  // User question
  sections.push(`\n## User Question:`)
  sections.push(req.query)

  // Instructions
  sections.push(`\n## Instructions:`)
  sections.push(`- Provide a clear, actionable answer based on the context above.
- **For project questions:** Always list actual projects by name from the Structured Context Objects, including their status and owner. Do not just say "you have N projects" - name them explicitly.
- Use markdown formatting for readability (headings, bullet lists, bold text for emphasis).
- If the context doesn't contain enough information, say so clearly instead of guessing.
- Suggest concrete next steps when appropriate.
- When listing projects, use a consistent format: "Project Name — status: [status] — owner: [name] — [additional info]"`)

  return sections.join('\n')
}

/**
 * Build prompt for Org mode
 */
function buildOrgPrompt(
  req: LoopbrainRequest,
  ctx: LoopbrainContextSummary,
  slackAvailable: boolean = false
): string {
  const sections: string[] = []

  // System guidance
  sections.push(`You are Loopbrain, Loopwell's Virtual COO assistant operating in Org mode.
Your role is to help users understand and manage organizational structure, teams, roles, and hierarchy.
You have access to contextual information about teams, departments, roles, and organizational structure.
Be helpful, concise, and focused on organizational clarity.`)

  // Slack integration info - only mention if explicitly requested or for Slack-specific queries
  if (slackAvailable && (req.sendToSlack || req.query.toLowerCase().includes('slack'))) {
    sections.push(`\n## Slack Integration Available

The workspace has Slack connected. You can send messages to Slack channels or read messages from channels.

### IMPORTANT: When to Use Slack

**ONLY use Slack when:**
- The user explicitly asks to send something to Slack (e.g., "send this to #general", "post to Slack")
- The user explicitly asks to read Slack messages (e.g., "read messages from #dev")

**DO NOT use Slack for:**
- General informational questions (e.g., "who works in my organization", "what teams exist")
- Questions that don't mention Slack explicitly
- Questions that are just asking for information without requesting a Slack action

### Sending Messages to Slack

When the user explicitly asks you to send a message to Slack:
1. Extract the channel name (e.g., #general, #loopwell-dev)
2. Extract the ACTUAL MESSAGE CONTENT
3. Include this format: [SLACK_SEND:channel=#channel-name:text=Your message here]

### Reading Messages from Slack

When the user explicitly asks to read Slack messages:
1. Extract the channel name (e.g., #general, #loopwell-dev)
2. Include this format: [SLACK_READ:channel=#channel-name:limit=50]

The system will automatically execute [SLACK_SEND:...] and [SLACK_READ:...] commands if they are present.`)
  }

  // Primary context
  if (ctx.primaryContext) {
    sections.push(`\n## Primary Context:`)
    sections.push(formatContextObject(ctx.primaryContext))
  }

  // Related items from semantic search
  if (ctx.retrievedItems && ctx.retrievedItems.length > 0) {
    sections.push(`\n## Related Items:`)
    ctx.retrievedItems.forEach(item => {
      sections.push(`- ${item.title} (${item.type})${item.score ? ` [relevance: ${item.score.toFixed(2)}]` : ''}`)
    })
  }

  // Org People ContextObjects (users with their roles/positions)
  if (ctx.orgPeople && ctx.orgPeople.length > 0) {
    const orgPeopleSlice = ctx.orgPeople.slice(0, 50) // Limit to top 50
    
    sections.push(`\n## Org People ContextObjects (JSON, ${ctx.orgPeople.length} total, showing top ${orgPeopleSlice.length}):`)
    sections.push(`The following structured context objects represent people in the organization with their roles, teams, and departments. When the user asks "who works in my organization" or "who is on my team", use this data to list people with their roles and teams.`)
    sections.push(`\n\`\`\`json`)
    
    const simplifiedOrgPeople = orgPeopleSlice.map(obj => ({
      id: obj.id,
      type: obj.type,
      title: obj.title, // This is the role/position title
      summary: obj.summary, // Contains person name, role, team info
      status: obj.status,
      tags: obj.tags.slice(0, 5), // Limit tags
      ownerId: obj.ownerId, // This is the userId (person occupying the role)
      updatedAt: obj.updatedAt.toISOString(),
      metadata: {
        level: obj.metadata?.level || undefined,
        team: obj.relations?.find(rel => rel.type === 'team')?.id || undefined,
        teamName: obj.summary.match(/team\s+([^)]+)/i)?.[1] || undefined,
        department: obj.summary.match(/department\s+([^)]+)/i)?.[1] || undefined
      },
      relations: obj.relations
        .filter(rel => rel.type === 'person' || rel.type === 'team')
        .map(rel => ({
          type: rel.type,
          id: rel.id,
          label: rel.label
        }))
    }))
    
    sections.push(JSON.stringify(simplifiedOrgPeople, null, 2))
    sections.push(`\`\`\``)
    sections.push(`\n**Instructions for org people questions:**`)
    sections.push(`- When the user asks "who works in my organization", "who is on my team", "who is on the [team name] team", or similar questions, you MUST list the people from the Org People ContextObjects above.`)
    sections.push(`- For each person, include: name (from summary), role/position (from title), and team (from metadata or summary).`)
    sections.push(`- Format as a clear list, for example:`)
    sections.push(`  **People in your organization:**`)
    sections.push(`  - Jane Doe — role: Senior Engineer — team: Backend Team`)
    sections.push(`  - John Smith — role: Product Manager — team: Product Team`)
    sections.push(`- If the user asks about a specific team, filter to only show people from that team.`)
    sections.push(`- Do NOT invent names that aren't present in the Org People ContextObjects.`)
    sections.push(`- If there are no people in the data, say so clearly: "I don't see any people in your organization yet."`)
    sections.push(`- Do NOT use Slack for these org-people questions unless the user explicitly asks to send something to Slack.`)
  } else {
    // Even if there are no org people, add a note so the LLM knows to check
    sections.push(`\n## Org People ContextObjects:`)
    sections.push(`The organization has 0 people with assigned roles. If the user asks about people in the organization, inform them that no people are currently assigned to roles.`)
  }

  // User question
  sections.push(`\n## User Question:`)
  sections.push(req.query)

  // Instructions
  sections.push(`\n## Instructions:`)
  sections.push(`- Provide a clear answer about organizational structure, roles, or teams.
- **For people questions:** Always list actual people by name from the Org People ContextObjects, including their role and team. Do not just say "you have N people" - name them explicitly.
- Use markdown formatting for readability.
- If the context doesn't contain enough information, say so clearly.
- Focus on clarity about who does what and how teams are structured.`)

  return sections.join('\n')
}

/**
 * Build prompt for Dashboard mode
 */
function buildDashboardPrompt(
  req: LoopbrainRequest,
  ctx: LoopbrainContextSummary,
  slackAvailable: boolean = false
): string {
  const sections: string[] = []

  // System guidance
  sections.push(`You are Loopbrain, Loopwell's Virtual COO assistant operating in Dashboard mode.
Your role is to provide high-level insights about the workspace, recent activity, and overall status.
You have access to workspace context and recent activity information.
Be helpful, concise, and focused on providing actionable insights.`)

  // Slack integration info - only mention if explicitly requested or for Slack-specific queries
  if (slackAvailable && (req.sendToSlack || req.query.toLowerCase().includes('slack'))) {
    sections.push(`\n## Slack Integration Available

The workspace has Slack connected. You can send messages to Slack channels or read messages from channels.

### IMPORTANT: When to Use Slack

**ONLY use Slack when:**
- The user explicitly asks to send something to Slack (e.g., "send this to #general", "post to Slack")
- The user explicitly asks to read Slack messages (e.g., "read messages from #dev")

**DO NOT use Slack for:**
- General informational questions (e.g., "what's the workspace status", "show me recent activity")
- Questions that don't mention Slack explicitly
- Questions that are just asking for information without requesting a Slack action

### Sending Messages to Slack

When the user explicitly asks you to send a message to Slack:
1. Extract the channel name (e.g., #general, #loopwell-dev)
2. Extract the ACTUAL MESSAGE CONTENT
3. Include this format: [SLACK_SEND:channel=#channel-name:text=Your message here]

### Reading Messages from Slack

When the user explicitly asks to read Slack messages:
1. Extract the channel name (e.g., #general, #loopwell-dev)
2. Include this format: [SLACK_READ:channel=#channel-name:limit=50]

The system will automatically execute [SLACK_SEND:...] and [SLACK_READ:...] commands if they are present.`)
  }

  // Primary context
  if (ctx.primaryContext) {
    sections.push(`\n## Primary Context:`)
    sections.push(formatContextObject(ctx.primaryContext))
  }

  // Related context (activity)
  if (ctx.relatedContext && ctx.relatedContext.length > 0) {
    sections.push(`\n## Recent Activity:`)
    ctx.relatedContext.forEach(relCtx => {
      sections.push(formatContextObject(relCtx))
    })
  }

  // Related items from semantic search
  if (ctx.retrievedItems && ctx.retrievedItems.length > 0) {
    sections.push(`\n## Related Items:`)
    ctx.retrievedItems.forEach(item => {
      sections.push(`- ${item.title} (${item.type})${item.score ? ` [relevance: ${item.score.toFixed(2)}]` : ''}`)
    })
  }

  // Org People ContextObjects (users with their roles/positions)
  if (ctx.orgPeople && ctx.orgPeople.length > 0) {
    const orgPeopleSlice = ctx.orgPeople.slice(0, 50) // Limit to top 50
    
    sections.push(`\n## Org People ContextObjects (JSON, ${ctx.orgPeople.length} total, showing top ${orgPeopleSlice.length}):`)
    sections.push(`The following structured context objects represent people in the organization with their roles, teams, and departments. When the user asks "who works in my organization" or "who is on my team", use this data to list people with their roles and teams.`)
    sections.push(`\n\`\`\`json`)
    
    const simplifiedOrgPeople = orgPeopleSlice.map(obj => ({
      id: obj.id,
      type: obj.type,
      title: obj.title, // This is the role/position title
      summary: obj.summary, // Contains person name, role, team info
      status: obj.status,
      tags: obj.tags.slice(0, 5), // Limit tags
      ownerId: obj.ownerId, // This is the userId (person occupying the role)
      updatedAt: obj.updatedAt.toISOString(),
      metadata: {
        level: obj.metadata?.level || undefined,
        team: obj.relations?.find(rel => rel.type === 'team')?.id || undefined,
        teamName: obj.summary.match(/team\s+([^)]+)/i)?.[1] || undefined,
        department: obj.summary.match(/department\s+([^)]+)/i)?.[1] || undefined
      },
      relations: obj.relations
        .filter(rel => rel.type === 'person' || rel.type === 'team')
        .map(rel => ({
          type: rel.type,
          id: rel.id,
          label: rel.label
        }))
    }))
    
    sections.push(JSON.stringify(simplifiedOrgPeople, null, 2))
    sections.push(`\`\`\``)
    sections.push(`\n**Instructions for org people questions:**`)
    sections.push(`- When the user asks "who works in my organization", "who is on my team", "who is on the [team name] team", or similar questions, you MUST list the people from the Org People ContextObjects above.`)
    sections.push(`- For each person, include: name (from summary), role/position (from title), and team (from metadata or summary).`)
    sections.push(`- Format as a clear list, for example:`)
    sections.push(`  **People in your organization:**`)
    sections.push(`  - Jane Doe — role: Senior Engineer — team: Backend Team`)
    sections.push(`  - John Smith — role: Product Manager — team: Product Team`)
    sections.push(`- If the user asks about a specific team, filter to only show people from that team.`)
    sections.push(`- Do NOT invent names that aren't present in the Org People ContextObjects.`)
    sections.push(`- If there are no people in the data, say so clearly: "I don't see any people in your organization yet."`)
    sections.push(`- Do NOT use Slack for these org-people questions unless the user explicitly asks to send something to Slack.`)
  } else {
    // Even if there are no org people, add a note so the LLM knows to check
    sections.push(`\n## Org People ContextObjects:`)
    sections.push(`The organization has 0 people with assigned roles. If the user asks about people in the organization, inform them that no people are currently assigned to roles.`)
  }

  // User question
  sections.push(`\n## User Question:`)
  sections.push(req.query)

  // Instructions
  sections.push(`\n## Instructions:`)
  sections.push(`- Provide a clear, high-level answer about workspace status and activity.
- **For people questions:** Always list actual people by name from the Org People ContextObjects, including their role and team. Do not just say "you have N people" - name them explicitly.
- Use markdown formatting for readability.
- Highlight important trends or issues if visible in the context.
- Suggest concrete next steps when appropriate.`)

  return sections.join('\n')
}

/**
 * Filter and sort project ContextObjects
 * Returns only projects that are not archived, sorted by updatedAt desc
 */
function filterProjectContextObjects(
  structuredContext: UnifiedContextObject[] | undefined
): UnifiedContextObject[] {
  if (!structuredContext) {
    return []
  }

  return structuredContext
    .filter(obj => {
      // Only include projects
      if (obj.type !== 'project') {
        return false
      }
      // Exclude archived projects (status 'archived' or tags containing 'archived')
      if (obj.status === 'archived' || obj.tags.includes('archived')) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      // Sort by updatedAt descending (most recent first)
      return b.updatedAt.getTime() - a.updatedAt.getTime()
    })
}

/**
 * Filter and sort task ContextObjects
 * Returns only tasks that are not archived/completed, sorted by updatedAt desc
 */
function filterTaskContextObjects(
  structuredContext: UnifiedContextObject[] | undefined
): UnifiedContextObject[] {
  if (!structuredContext) {
    return []
  }

  return structuredContext
    .filter(obj => {
      // Only include tasks
      if (obj.type !== 'task') {
        return false
      }
      // Exclude completed tasks (status 'done' or 'completed')
      if (obj.status === 'done' || obj.status === 'completed') {
        return false
      }
      return true
    })
    .sort((a, b) => {
      // Sort by updatedAt descending (most recent first)
      return b.updatedAt.getTime() - a.updatedAt.getTime()
    })
}

/**
 * Infer blocked and at-risk projects from ContextObjects
 * Uses simple, explainable rules based on task status, tags, and due dates
 */
function inferBlockedOrAtRiskProjects(
  structuredContext: UnifiedContextObject[] | undefined
): {
  blocked: UnifiedContextObject[]
  atRisk: UnifiedContextObject[]
} {
  if (!structuredContext) {
    return { blocked: [], atRisk: [] }
  }

  const projects = filterProjectContextObjects(structuredContext)
  const tasks = filterTaskContextObjects(structuredContext)

  // Build a map of projectId -> tasks for that project
  const projectTasksMap = new Map<string, UnifiedContextObject[]>()
  for (const task of tasks) {
    // Find the project relation
    const projectRelation = task.relations.find(rel => rel.type === 'project')
    if (projectRelation) {
      const projectId = projectRelation.id
      if (!projectTasksMap.has(projectId)) {
        projectTasksMap.set(projectId, [])
      }
      projectTasksMap.get(projectId)!.push(task)
    }
  }

  const blocked: UnifiedContextObject[] = []
  const atRisk: UnifiedContextObject[] = []

  for (const project of projects) {
    const projectTasks = projectTasksMap.get(project.id) || []

    // Check if project is blocked
    const hasBlockedTask = projectTasks.some(task => {
      // Task is blocked if:
      // 1. Status is 'blocked'
      // 2. Tags contain 'blocked', 'stuck', 'waiting', or 'dependency'
      const statusBlocked = task.status === 'blocked'
      const tagsBlocked = task.tags.some(tag => 
        ['blocked', 'stuck', 'waiting', 'dependency'].includes(tag.toLowerCase())
      )
      return statusBlocked || tagsBlocked
    })

    if (hasBlockedTask) {
      blocked.push(project)
    }

    // Check if project is at risk
    const now = new Date()
    const overdueTasks = projectTasks.filter(task => {
      const dueDate = task.metadata?.dueDate
      if (!dueDate) return false
      try {
        const due = new Date(dueDate as string)
        return due < now && task.status !== 'done' && task.status !== 'completed'
      } catch {
        return false
      }
    })

    const hasManyIncompleteTasks = projectTasks.filter(task => 
      task.status !== 'done' && task.status !== 'completed'
    ).length > 5 // More than 5 incomplete tasks suggests risk

    const projectStatusAtRisk = project.status === 'on-hold' || 
                                 project.tags.some(tag => 
                                   ['delayed', 'behind', 'at-risk'].includes(tag.toLowerCase())
                                 )

    if (overdueTasks.length > 0 || hasManyIncompleteTasks || projectStatusAtRisk) {
      // Only add if not already in blocked
      if (!blocked.includes(project)) {
        atRisk.push(project)
      }
    }
  }

  return { blocked, atRisk }
}

/**
 * Format a ContextObject into a readable string for prompts
 */
function formatContextObject(ctx: any): string {
  const parts: string[] = []

  switch (ctx.type) {
    case ContextType.WORKSPACE:
      parts.push(`Workspace: ${ctx.name}`)
      if (ctx.description) parts.push(`Description: ${ctx.description}`)
      if (ctx.memberCount !== undefined) parts.push(`Members: ${ctx.memberCount}`)
      if (ctx.projectCount !== undefined) parts.push(`Projects: ${ctx.projectCount}`)
      if (ctx.pageCount !== undefined) parts.push(`Pages: ${ctx.pageCount}`)
      break

    case ContextType.PAGE:
      parts.push(`Page: ${ctx.title}`)
      if (ctx.excerpt) parts.push(`Excerpt: ${ctx.excerpt}`)
      // Include full content (already processed with grouped code blocks) for complete context
      if (ctx.content) {
        // Strip HTML tags for text-only representation in prompt
        const textContent = ctx.content.replace(/<[^>]*>/g, '').trim()
        if (textContent) {
          parts.push(`Content:\n${textContent}`)
        }
      }
      if (ctx.category) parts.push(`Category: ${ctx.category}`)
      if (ctx.tags && ctx.tags.length > 0) {
        parts.push(`Tags: ${ctx.tags.join(', ')}`)
      }
      break

    case ContextType.PROJECT:
      parts.push(`Project: ${ctx.name}`)
      if (ctx.description) parts.push(`Description: ${ctx.description}`)
      parts.push(`Status: ${ctx.status}`)
      if (ctx.priority) parts.push(`Priority: ${ctx.priority}`)
      if (ctx.tasks && ctx.tasks.length > 0) {
        parts.push(`Tasks: ${ctx.tasks.length} tasks`)
      }
      break

    case ContextType.TASK:
      parts.push(`Task: ${ctx.title}`)
      if (ctx.description) parts.push(`Description: ${ctx.description}`)
      parts.push(`Status: ${ctx.status}`)
      if (ctx.priority) parts.push(`Priority: ${ctx.priority}`)
      if (ctx.project) parts.push(`Project: ${ctx.project.name}`)
      break

    case ContextType.ORG:
      if (ctx.teams && ctx.teams.length > 0) {
        parts.push(`Teams: ${ctx.teams.map((t: any) => t.name).join(', ')}`)
      }
      if (ctx.roles && ctx.roles.length > 0) {
        parts.push(`Roles: ${ctx.roles.length} roles`)
      }
      break

    case ContextType.ACTIVITY:
      if (ctx.activities && ctx.activities.length > 0) {
        parts.push(`Recent Activities: ${ctx.activities.length} activities`)
        ctx.activities.slice(0, 5).forEach((act: any) => {
          parts.push(`- ${act.action} on ${act.entity} (${act.userName})`)
        })
      }
      break

    case ContextType.UNIFIED:
      if (ctx.workspace) {
        parts.push(`Workspace: ${ctx.workspace.name}`)
      }
      if (ctx.activeProject) {
        parts.push(`Active Project: ${ctx.activeProject.name}`)
      }
      if (ctx.activePage) {
        parts.push(`Active Page: ${ctx.activePage.title}`)
      }
      if (ctx.activeTask) {
        parts.push(`Active Task: ${ctx.activeTask.title}`)
      }
      break
  }

  return parts.join('\n')
}

/**
 * Call LLM via existing AI provider
 */
async function callLoopbrainLLM(prompt: string): Promise<{
  content: string
  model: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}> {
  const model = process.env.LOOPBRAIN_MODEL || DEFAULT_LOOPBRAIN_MODEL

  try {
    const response = await generateAIResponse(prompt, model, {
      systemPrompt: 'You are Loopbrain, Loopwell\'s Virtual COO assistant.',
      temperature: 0.7,
      maxTokens: 2000
    })

    return {
      content: response.content,
      model: response.model,
      usage: response.usage
    }
  } catch (error) {
    logger.error('LLM call failed in Loopbrain orchestrator', { error, model })
    throw new Error(`LLM call failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Pre-process Slack read requests - try to extract channel and fetch messages
 * Returns { read: boolean, message?: string, messageCount?: number }
 */
async function preprocessSlackReadRequest(
  req: LoopbrainRequest,
  slackAvailable: boolean
): Promise<{ read: boolean; message?: string; messageCount?: number }> {
  if (!slackAvailable) {
    return { read: false }
  }

  const query = req.query.toLowerCase()
  logger.debug('Pre-processing query for Slack read intent', { query, workspaceId: req.workspaceId })
  
  // Check if query mentions reading Slack conversations
  const readKeywords = [
    'read slack',
    'read from slack',
    'read messages from',
    'read conversations from',
    'show slack messages',
    'show messages from',
    'get slack messages',
    'get messages from',
    'what was said',
    'what was said in',
    'what\'s in',
    'what\'s been said',
    'messages in',
    'conversation in',
    'recent messages',
    'latest messages',
    'tell me what',
    'can you tell me what'
  ]
  const hasReadIntent = readKeywords.some(keyword => query.includes(keyword))
  
  if (!hasReadIntent) {
    return { read: false }
  }

  logger.debug('Slack read intent detected, extracting channel', { query })

  // Try to extract channel (look for #channel-name pattern)
  let channelMatch = req.query.match(/#([\w-]+)/i)
  let channel = ''
  
  if (channelMatch) {
    channel = `#${channelMatch[1]}`
  } else {
    // Try to find channel name after common patterns
    const channelPattern = /(?:from|in|channel|on)\s+#?([\w-]+)/i
    const altMatch = req.query.match(channelPattern)
    if (altMatch) {
      channel = `#${altMatch[1]}`
      channelMatch = altMatch
    }
  }
  
  if (!channel) {
    logger.debug('Could not extract channel from query for read', { query })
    return { read: false } // Let LLM handle it
  }

  logger.debug('Extracted channel for read', { channel })

  // Try to extract limit (e.g., "last 10 messages", "recent 5")
  let limit = 50 // default
  const limitMatch = req.query.match(/(?:last|recent|latest|show)\s+(\d+)/i)
  if (limitMatch && limitMatch[1]) {
    limit = Math.min(Math.max(1, parseInt(limitMatch[1])), 100)
  }

  // Fetch messages
  try {
    logger.info('Pre-processing Slack read request - fetching messages', { workspaceId: req.workspaceId, channel, limit })
    const result = await loopbrainReadSlackChannel({
      workspaceId: req.workspaceId,
      channel,
      limit
    })

    if (result.success && result.messages) {
      const messageCount = result.messages.length
      logger.info('Slack messages fetched successfully via pre-processing', { workspaceId: req.workspaceId, channel, messageCount })
      
      // Format messages for display
      if (messageCount === 0) {
        return {
          read: true,
          message: `📭 No messages found in ${channel}.`,
          messageCount: 0
        }
      }

      // Generate a summary using LLM
      try {
        const messages = result.messages
        const messagesText = messages
          .map((msg) => {
            const timestamp = new Date(parseFloat(msg.ts) * 1000).toLocaleString()
            return `[${timestamp}] ${msg.user}: ${msg.text}`
          })
          .join('\n')

        // Create a summary prompt
        const summaryPrompt = `Summarize the following Slack messages from ${channel}. Provide a concise summary of the key topics, decisions, and action items discussed. Keep it brief and focused on the most important information.

Messages:
${messagesText}

Provide a clear, concise summary:`

        const summaryResponse = await callLoopbrainLLM(summaryPrompt)
        const summary = summaryResponse.content.trim()

        return {
          read: true,
          message: `📬 **Summary of recent messages from ${channel}** (${messageCount} message${messageCount !== 1 ? 's' : ''}):\n\n${summary}`,
          messageCount
        }
      } catch (summaryError) {
        logger.error('Error generating summary in pre-processing', {
          workspaceId: req.workspaceId,
          channel,
          error: summaryError instanceof Error ? summaryError.message : String(summaryError)
        })
        // Fallback to simple message count if summary fails
        return {
          read: true,
          message: `📬 Found ${messageCount} message${messageCount !== 1 ? 's' : ''} in ${channel}.`,
          messageCount
        }
      }
    } else {
      logger.error('Slack read failed in pre-processing', { workspaceId: req.workspaceId, channel, error: result.error })
      return {
        read: true,
        message: `❌ Failed to read messages from Slack: ${result.error || 'Unknown error'}`,
        messageCount: 0
      }
    }
  } catch (error) {
    logger.error('Error in pre-process Slack read request', {
      workspaceId: req.workspaceId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return { read: false } // Let LLM handle it
  }
}

/**
 * Pre-process Slack requests - try to extract channel and message from user query
 * Returns { sent: boolean, message?: string }
 */
async function preprocessSlackRequest(
  req: LoopbrainRequest,
  slackAvailable: boolean
): Promise<{ sent: boolean; message?: string }> {
  if (!slackAvailable) {
    logger.debug('Slack not available, skipping pre-processing', { workspaceId: req.workspaceId })
    return { sent: false }
  }

  // If explicit sendToSlack flag is set, handle it
  if (req.sendToSlack) {
    logger.debug('Explicit sendToSlack flag set, processing Slack send', { workspaceId: req.workspaceId })
    const channel = req.slackChannel || '#general'
    // Use the query as the message, or generate a summary
    const message = req.query.trim()
    
    if (message.length < 3) {
      logger.debug('Message too short for Slack send', { message })
      return { sent: false }
    }

    try {
      const result = await loopbrainSendSlackMessage({
        workspaceId: req.workspaceId,
        channel,
        text: message
      })

      if (result.success) {
        return {
          sent: true,
          message: `✅ Message sent to ${channel} successfully!`
        }
      } else {
        // Return sent: false so main answer still generates, but log the error
        logger.error('Slack send failed with explicit flag', {
          workspaceId: req.workspaceId,
          channel,
          error: result.error
        })
        return { sent: false, message: `Note: I tried to send this to ${channel}, but there was an issue. ${result.error || 'Slack configuration may be incomplete.'}` }
      }
    } catch (error) {
      logger.error('Error sending to Slack with explicit flag', {
        workspaceId: req.workspaceId,
        error: error instanceof Error ? error.message : String(error)
      })
      return { sent: false }
    }
  }

  const query = req.query.toLowerCase()
  logger.debug('Pre-processing query for Slack intent', { query, workspaceId: req.workspaceId })
  
  // VERY RESTRICTIVE: Only trigger on explicit Slack mentions
  // Must include "slack" AND a channel reference (#channel) AND a send verb
  const hasExplicitSlackMention = query.includes('slack')
  const hasChannelReference = /#[\w-]+/.test(req.query)
  const hasSendVerb = /\b(send|post|share|announce|message)\b/.test(query)
  
  // All three conditions must be true
  const hasSlackIntent = hasExplicitSlackMention && hasChannelReference && hasSendVerb
  
  if (!hasSlackIntent) {
    logger.debug('No Slack intent detected in query', { query })
    return { sent: false }
  }

  logger.debug('Slack intent detected, extracting channel and message', { query })

  // Try to extract channel (look for #channel-name pattern - more flexible)
  // Also handle channel names without # prefix if followed by common patterns
  let channelMatch = req.query.match(/#([\w-]+)/i)
  let channel = ''
  
  if (channelMatch) {
    channel = `#${channelMatch[1]}`
  } else {
    // Try to find channel name after common patterns like "to #", "in #", "channel #"
    const channelPattern = /(?:to|in|channel|on)\s+#?([\w-]+)/i
    const altMatch = req.query.match(channelPattern)
    if (altMatch) {
      channel = `#${altMatch[1]}`
      channelMatch = altMatch
    }
  }
  
  if (!channel) {
    logger.debug('Could not extract channel from query', { query })
    return { sent: false } // Can't extract channel, let LLM handle it
  }

  logger.debug('Extracted channel', { channel })
  
  // Try to extract message text - handle various formats with improved patterns
  // Priority: quoted text first, then explicit message indicators, then fallback patterns
  let message = ''
  
  // Pattern 1 (HIGHEST PRIORITY): "the message should be" or "message should be" followed by quoted text
  // This handles: "the message should be - 'hey; i'm working'" or "the messgae should be - 'hey; i'm working'"
  // Also handles variations like "should be:", "should be -", etc.
  const messageShouldBePattern = /(?:the\s+)?(?:message|text|messgae|mesage)\s+should\s+be[:\s-]+["']([^"']{3,})["']/i
  const messageShouldBeMatch = req.query.match(messageShouldBePattern)
  if (messageShouldBeMatch && messageShouldBeMatch[1]) {
    message = messageShouldBeMatch[1].trim()
    logger.debug('Extracted message via "message should be" pattern', { message })
  }

  // Pattern 1b: More flexible - "should be" followed by quoted text (catches typos and variations)
  if (!message) {
    const shouldBePattern = /should\s+be[:\s-]+["']([^"']{3,})["']/i
    const shouldBeMatch = req.query.match(shouldBePattern)
    if (shouldBeMatch && shouldBeMatch[1]) {
      const extracted = shouldBeMatch[1].trim()
      // Make sure it's not instruction text
      const isInstruction = /(?:slack|channel|send|post)/i.test(extracted)
      if (!isInstruction) {
        message = extracted
        logger.debug('Extracted message via "should be" pattern', { message })
      }
    }
  }

  // Pattern 2 (HIGH PRIORITY): Look for quoted text (single or double quotes) - prioritize this
  // This should catch: 'hey; i'm working' or "hey; i'm working"
  if (!message) {
    const quotedPattern = /["']([^"']{3,})["']/
    const quotedMatch = req.query.match(quotedPattern)
    if (quotedMatch && quotedMatch[1]) {
      // Make sure we're not extracting instruction text
      const quotedText = quotedMatch[1].trim()
      // Skip if it looks like instruction text (contains "slack", "channel", "message should", etc.)
      const isInstruction = /(?:slack|channel|message\s+should|send|post|to\s+#)/i.test(quotedText)
      if (!isInstruction) {
        message = quotedText
        logger.debug('Extracted message via quoted pattern', { message })
      }
    }
  }

  // Pattern 3: "say: message" or "saying: message" (with colon)
  if (!message) {
    const sayColonPattern = /(?:say|saying|message|text|tell|inform)[:\s]+["']?([^"']+)["']?/i
    const sayColonMatch = req.query.match(sayColonPattern)
    if (sayColonMatch && sayColonMatch[1]) {
      const extracted = sayColonMatch[1].trim()
      // Skip if it contains instruction keywords
      const isInstruction = /(?:slack|channel|message\s+should|send\s+to|post\s+to)/i.test(extracted)
      if (!isInstruction) {
        message = extracted
        logger.debug('Extracted message via say: pattern', { message })
      }
    }
  }

  // Pattern 4: "say message" or "tell message" (without colon, after channel)
  if (!message && channelMatch) {
    const afterChannelSayPattern = new RegExp(`${channelMatch[0]}[^#]*?(?:say|saying|tell|message|text|that|about)[:\\s-]+["']?([^"']+)["']?`, 'i')
    const afterChannelSayMatch = req.query.match(afterChannelSayPattern)
    if (afterChannelSayMatch && afterChannelSayMatch[1]) {
      const extracted = afterChannelSayMatch[1].trim()
      // Skip if it contains instruction keywords
      const isInstruction = /(?:slack|channel|message\s+should|send\s+to|post\s+to)/i.test(extracted)
      if (!isInstruction) {
        message = extracted
        logger.debug('Extracted message via after-channel-say pattern', { message })
      }
    }
  }

  // Pattern 5: Everything after "say:" or "saying:" until end
  if (!message) {
    const afterSayPattern = /(?:say|saying|tell|message|text)[:\s-]+(.+?)(?:\s*$|\.|$)/i
    const afterSayMatch = req.query.match(afterSayPattern)
    if (afterSayMatch && afterSayMatch[1]) {
      // Remove channel reference if it appears in the message
      let extracted = afterSayMatch[1].trim().replace(/["']/g, '').replace(/\s+/g, ' ')
      if (channelMatch) {
        extracted = extracted.replace(new RegExp(channelMatch[0], 'gi'), '').trim()
      }
      // Skip if it contains instruction keywords
      const isInstruction = /(?:slack|channel|message\s+should|send\s+to|post\s+to)/i.test(extracted)
      if (extracted.length > 0 && !isInstruction) {
        message = extracted
        logger.debug('Extracted message via after-say pattern', { message })
      }
    }
  }

  // Pattern 6: Everything after channel mention (if no explicit "say" keyword)
  // This is lower priority and should be more careful to avoid instruction text
  if (!message && channelMatch) {
    const afterChannelPattern = new RegExp(`${channelMatch[0]}[^#]*?[-\\s]+(.+?)(?:\\.|$)`, 'i')
    const afterChannelMatch = req.query.match(afterChannelPattern)
    if (afterChannelMatch && afterChannelMatch[1]) {
      let extracted = afterChannelMatch[1].trim()
      // Remove common prefixes
      extracted = extracted.replace(/^(?:that|about|saying|say|tell|message|text|the\s+message\s+should\s+be)[:\s-]+/i, '')
      extracted = extracted.replace(/["']/g, '').replace(/\.$/, '').trim()
      // Skip if it contains instruction keywords or looks like instruction text
      const isInstruction = /(?:slack|channel|message\s+should|send\s+to|post\s+to|on\s+slack)/i.test(extracted)
      if (extracted.length >= 3 && !isInstruction) {
        message = extracted
        logger.debug('Extracted message via after-channel pattern', { message })
      }
    }
  }

  // Pattern 7: If query is simple like "send X to #channel", extract X
  if (!message && channelMatch) {
    const simplePattern = new RegExp(`(?:send|post|share|announce|message)\\s+([^#]+?)\\s+(?:to|in)\\s+${channelMatch[0]}`, 'i')
    const simpleMatch = req.query.match(simplePattern)
    if (simpleMatch && simpleMatch[1]) {
      const extracted = simpleMatch[1].trim().replace(/["']/g, '')
      // Skip if it contains instruction keywords
      const isInstruction = /(?:slack|channel|message\s+should|send\s+to|post\s+to)/i.test(extracted)
      if (!isInstruction) {
        message = extracted
        logger.debug('Extracted message via simple pattern', { message })
      }
    }
  }

  // If still no message, let LLM handle it
  if (!message || message.length < 3) {
    logger.debug('Could not extract message, letting LLM handle', { query, channel })
    return { sent: false } // Let LLM handle it
  }

  // Send the message
  try {
    logger.info('Pre-processing Slack request - sending message', { workspaceId: req.workspaceId, channel, message })
    const result = await loopbrainSendSlackMessage({
      workspaceId: req.workspaceId,
      channel,
      text: message
    })

    if (result.success) {
      logger.info('Slack message sent successfully via pre-processing', { workspaceId: req.workspaceId, channel, ts: result.ts })
      return {
        sent: true,
        message: `✅ Message sent to ${channel} in Slack!\n\n"${message}"`
      }
    } else {
      logger.error('Slack message send failed in pre-processing', { workspaceId: req.workspaceId, channel, error: result.error })
      // Don't return sent: true with error - let the main flow continue and handle error gracefully
      // Return sent: false so the main answer is still generated
      return {
        sent: false,
        message: undefined // Error will be handled in handleSlackActions if LLM includes [SLACK_SEND:...]
      }
    }
  } catch (error) {
    logger.error('Error in pre-process Slack request', {
      workspaceId: req.workspaceId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return { sent: false } // Let LLM handle it
  }
}

/**
 * Handle Slack actions from LLM response
 * Parses [SLACK_SEND:...] and [SLACK_READ:...] commands and executes them
 * Also includes fallback detection for Slack intent in natural language
 * Returns updated response content with messages if read commands were executed
 */
async function handleSlackActions(
  req: LoopbrainRequest,
  llmResponse: string,
  slackAvailable: boolean,
  contextSummary?: LoopbrainContextSummary
): Promise<string> {
  if (!slackAvailable) return llmResponse

  let updatedResponse = llmResponse
  let slackErrorOccurred = false
  let slackErrorMessage = ''

  // Look for [SLACK_READ:channel=...:limit=...] patterns in the response
  const slackReadPattern = /\[SLACK_READ:channel=([^:]+)(?::limit=(\d+))?\]/gi
  const readMatches = Array.from(llmResponse.matchAll(slackReadPattern))

  for (const match of readMatches) {
    let channel = match[1].trim()
    const limitStr = match[2]?.trim()
    const limit = limitStr ? Math.min(Math.max(1, parseInt(limitStr)), 100) : 50

    // Ensure channel starts with #
    if (!channel.startsWith('#')) {
      channel = `#${channel}`
    }

    if (!channel) {
      logger.warn('Invalid Slack read command format', { channel, workspaceId: req.workspaceId })
      continue
    }

    try {
      logger.info('Loopbrain executing Slack read action', { workspaceId: req.workspaceId, channel, limit })
      const result = await loopbrainReadSlackChannel({
        workspaceId: req.workspaceId,
        channel,
        limit
      })

      if (!result.success) {
        logger.error('Loopbrain Slack read failed', { workspaceId: req.workspaceId, channel, error: result.error })
        // Replace with user-friendly error message, but don't break the main answer
        const userFriendlyError = result.error?.includes('channel_not_found') 
          ? `I couldn't access ${channel}. The channel may not exist or I may not have access to it.`
          : `I had trouble reading messages from ${channel}. Your Slack configuration may need attention.`
        updatedResponse = updatedResponse.replace(match[0], `\n_Note: ${userFriendlyError}_`)
        slackErrorOccurred = true
        slackErrorMessage = userFriendlyError
      } else {
        const messageCount = result.messages?.length || 0
        logger.info('Loopbrain Slack messages read successfully', { workspaceId: req.workspaceId, channel, messageCount })
        
        if (messageCount === 0) {
          // Replace the command with a no messages message
          updatedResponse = updatedResponse.replace(match[0], `📭 No messages found in ${channel}.`)
        } else {
          // Generate a summary using LLM instead of listing all messages
          try {
            const messages = result.messages!
            const messagesText = messages
              .map((msg) => {
                const timestamp = new Date(parseFloat(msg.ts) * 1000).toLocaleString()
                return `[${timestamp}] ${msg.user}: ${msg.text}`
              })
              .join('\n')

            // Create a summary prompt
            const summaryPrompt = `Summarize the following Slack messages from ${channel}. Provide a concise summary of the key topics, decisions, and action items discussed. Keep it brief and focused on the most important information.

Messages:
${messagesText}

Provide a clear, concise summary:`

            const summaryResponse = await callLoopbrainLLM(summaryPrompt)
            const summary = summaryResponse.content.trim()

            // Replace the command with the summary
            const summaryBlock = `📬 **Summary of recent messages from ${channel}** (${messageCount} message${messageCount !== 1 ? 's' : ''}):\n\n${summary}`
            updatedResponse = updatedResponse.replace(match[0], summaryBlock)
          } catch (summaryError) {
            logger.error('Error generating summary', {
              workspaceId: req.workspaceId,
              channel,
              error: summaryError instanceof Error ? summaryError.message : String(summaryError)
            })
            // Fallback to simple message count if summary fails
            updatedResponse = updatedResponse.replace(match[0], `📬 Found ${messageCount} message${messageCount !== 1 ? 's' : ''} in ${channel}.`)
          }
        }
      }
    } catch (error) {
      logger.error('Error executing Slack read action', {
        workspaceId: req.workspaceId,
        channel,
        error: error instanceof Error ? error.message : String(error)
      })
      // Replace with user-friendly error, but don't break the main answer
      updatedResponse = updatedResponse.replace(match[0], `\n_Note: I had trouble reading messages from ${channel}. Your Slack configuration may need attention._`)
      slackErrorOccurred = true
    }
  }

  // Look for [SLACK_SEND:channel=...:text=...] patterns in the response (primary method)
  // Support variations: channel with or without #, text with or without quotes
  const slackSendPattern = /\[SLACK_SEND:channel=([^:]+):text=([^\]]+)\]/gi
  const matches = Array.from(updatedResponse.matchAll(slackSendPattern))

  let sentCount = 0

  for (const match of matches) {
    let channel = match[1].trim()
    let text = match[2].trim()

    // Ensure channel starts with #
    if (!channel.startsWith('#')) {
      channel = `#${channel}`
    }

    // Clean up text (remove quotes if present)
    text = text.replace(/^["']|["']$/g, '').trim()

    if (!channel || !text || text.length < 1) {
      logger.warn('Invalid Slack send command format', { channel, text, workspaceId: req.workspaceId })
      continue
    }

    try {
      logger.info('Loopbrain executing Slack send action', { workspaceId: req.workspaceId, channel, text })
      const result = await loopbrainSendSlackMessage({
        workspaceId: req.workspaceId,
        channel,
        text
      })

      if (!result.success) {
        logger.error('Loopbrain Slack send failed', { workspaceId: req.workspaceId, channel, error: result.error })
        // Replace with user-friendly error message
        const userFriendlyError = result.error?.includes('channel_not_found')
          ? `I couldn't send to ${channel}. The channel may not exist or I may not have access to it.`
          : result.error?.includes('not_authed') || result.error?.includes('invalid_auth')
          ? `I couldn't send to ${channel}. Your Slack integration may need to be reconnected.`
          : `I had trouble sending to ${channel}. ${result.error || 'Slack configuration may be incomplete.'}`
        updatedResponse = updatedResponse.replace(match[0], `\n_Note: ${userFriendlyError}_`)
        slackErrorOccurred = true
        slackErrorMessage = userFriendlyError
      } else {
        logger.info('Loopbrain Slack message sent successfully', { workspaceId: req.workspaceId, channel, ts: result.ts })
        sentCount++
        // Replace command with success message
        updatedResponse = updatedResponse.replace(match[0], `\n✅ Message sent to ${channel}`)
      }
    } catch (error) {
      logger.error('Error executing Slack action', {
        workspaceId: req.workspaceId,
        channel,
        error: error instanceof Error ? error.message : String(error)
      })
      // Replace with user-friendly error
      const userFriendlyError = `I had trouble sending to ${channel}. Your Slack configuration may need attention.`
      updatedResponse = updatedResponse.replace(match[0], `\n_Note: ${userFriendlyError}_`)
      slackErrorOccurred = true
      slackErrorMessage = userFriendlyError
    }
  }

  // REMOVED: Fallback detection is too aggressive and triggers on informational questions
  // Only use explicit [SLACK_SEND:...] format or explicit sendToSlack flag
  // The fallback detectAndSendSlackFromResponse function is no longer called here

  // If Slack errors occurred but we have a main answer, append a subtle note at the end
  // Don't let Slack errors dominate the response
  if (slackErrorOccurred && slackErrorMessage && updatedResponse.trim().length > 50) {
    // Only append if the response is substantial (not just an error message)
    // Append as a subtle note, not a prominent error
    updatedResponse += `\n\n---\n_${slackErrorMessage}_`
  }

  return updatedResponse
}

/**
 * Fallback detection: Try to extract Slack intent from LLM response and original query
 * This handles cases where the LLM didn't use the exact [SLACK_SEND:...] format
 */
async function detectAndSendSlackFromResponse(
  req: LoopbrainRequest,
  llmResponse: string
): Promise<{ sent: boolean; message?: string }> {
  const query = req.query.toLowerCase()
  const response = llmResponse.toLowerCase()

  // Check if original query had Slack intent
  const slackKeywords = ['slack', 'send to', 'message to', 'notify', 'post to', 'send a message', 'send message', 'post message']
  const hasSlackIntent = slackKeywords.some(keyword => query.includes(keyword))

  if (!hasSlackIntent) {
    return { sent: false }
  }

  // Check if LLM response indicates it tried to send or wants to send
  const sendIndicators = [
    'sent to slack',
    'sent to #',
    'message sent',
    'posted to slack',
    'notified',
    'sent in slack',
    'delivered to slack'
  ]
  const indicatesSent = sendIndicators.some(indicator => response.includes(indicator))

  // Try to extract channel from original query
  const channelMatch = req.query.match(/#([\w-]+)/i)
  if (!channelMatch) {
    return { sent: false }
  }

  const channel = `#${channelMatch[1]}`

  // Try to extract message from original query or LLM response
  let message = ''

  // First, try to get message from original query
  const queryMessagePatterns = [
    /(?:say|saying|tell|message|text|that|about)[:\s-]+["']?([^"']{3,})["']?/i,
    /["']([^"']{3,})["']/
  ]

  for (const pattern of queryMessagePatterns) {
    const match = req.query.match(pattern)
    if (match && match[1]) {
      message = match[1].trim()
      break
    }
  }

  // If no message from query, try to extract from LLM response
  if (!message && indicatesSent) {
    // Look for quoted text in response
    const quotedMatch = llmResponse.match(/["']([^"']{3,})["']/)
    if (quotedMatch) {
      message = quotedMatch[1].trim()
    } else {
      // Try to get a short summary from response
      const sentences = llmResponse.split(/[.!?]/)
      const firstSentence = sentences[0]?.trim()
      if (firstSentence && firstSentence.length < 200) {
        message = firstSentence
      }
    }
  }

  // If we have channel and message, send it
  if (channel && message && message.length >= 3) {
    try {
      logger.info('Fallback: Sending Slack message detected from response', { workspaceId: req.workspaceId, channel, message })
      const result = await loopbrainSendSlackMessage({
        workspaceId: req.workspaceId,
        channel,
        text: message
      })

      if (result.success) {
        logger.info('Fallback Slack message sent successfully', { workspaceId: req.workspaceId, channel, ts: result.ts })
        return { sent: true, message: `✅ Message sent to ${channel} in Slack!` }
      } else {
        logger.error('Fallback Slack message send failed', { workspaceId: req.workspaceId, channel, error: result.error })
        return { sent: false }
      }
    } catch (error) {
      logger.error('Error in fallback Slack send', {
        workspaceId: req.workspaceId,
        error: error instanceof Error ? error.message : String(error)
      })
      return { sent: false }
    }
  }

  return { sent: false }
}

/**
 * Build suggestions for Spaces mode
 */
function buildSpacesSuggestions(slackAvailable: boolean = false): LoopbrainSuggestion[] {
  const suggestions: LoopbrainSuggestion[] = [
    {
      label: 'Create tasks from this answer',
      action: 'create_tasks_from_answer'
    },
    {
      label: 'Update project status',
      action: 'update_project_status'
    }
  ]

  if (slackAvailable) {
    suggestions.push({
      label: 'Send to Slack',
      action: 'send_slack',
      payload: { integration: 'slack' }
    })
  }

  return suggestions
}

/**
 * Build suggestions for Org mode
 */
function buildOrgSuggestions(slackAvailable: boolean = false): LoopbrainSuggestion[] {
  const suggestions: LoopbrainSuggestion[] = [
    {
      label: 'Update role responsibilities',
      action: 'update_role_responsibilities'
    }
  ]

  if (slackAvailable) {
    suggestions.push({
      label: 'Send to Slack',
      action: 'send_slack',
      payload: { integration: 'slack' }
    })
  }

  return suggestions
}

/**
 * Build suggestions for Dashboard mode
 */
function buildDashboardSuggestions(slackAvailable: boolean = false): LoopbrainSuggestion[] {
  const suggestions: LoopbrainSuggestion[] = [
    {
      label: 'Create meeting notes',
      action: 'create_meeting_notes'
    },
    {
      label: 'Log risks',
      action: 'log_risks'
    }
  ]

  if (slackAvailable) {
    suggestions.push({
      label: 'Send to Slack',
      action: 'send_slack',
      payload: { integration: 'slack' }
    })
  }

  return suggestions
}

