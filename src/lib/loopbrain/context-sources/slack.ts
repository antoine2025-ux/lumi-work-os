/**
 * Slack Context Provider (Tier A + Tier B)
 *
 * Two tiers:
 * 1. Tier A (persistent) — Rolling sync of public channel messages into
 *    ContextItems for briefing, meeting-prep, and search use. Mirrors the
 *    Gmail context-source pattern.
 * 2. Tier B (non-persistent) — Request-time fetch driven by project
 *    slackChannelHints for real-time Loopbrain enrichment.
 *
 * Slack tokens are workspace-scoped (one bot token per workspace), unlike
 * Gmail which is per-user. The sync loop iterates workspaces, not users.
 */

import { prisma } from '@/lib/db'
import { getSlackChannelMessages, getSlackChannels, getSlackIntegration } from '@/lib/integrations/slack-service'
import { logger } from '@/lib/logger'

// =============================================================================
// Constants
// =============================================================================

const SLACK_MESSAGE_TYPE = 'slack_message'
const SYNC_COOLDOWN_MS = 60 * 60 * 1000 // 1 hour
const CONTEXT_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const MAX_MESSAGES_PER_CHANNEL = 100
const SYNC_WINDOW_DAYS = 7
const MAX_SUMMARY_CHARS = 500
const MAX_PROMPT_CHARS = 8000 // ~2000 tokens

// =============================================================================
// Tier A Types
// =============================================================================

export interface SlackStoredMessage {
  channelId: string
  channelName: string
  userName: string
  userId?: string
  text: string
  timestamp: string
  threadTs?: string
}

export interface SyncSlackContextResult {
  synced: number
  channels: number
}

// =============================================================================
// Tier A — Rolling Sync (persistent ContextItems)
// =============================================================================

/**
 * Sync recent Slack messages into ContextItems for offline/briefing use.
 *
 * Rate-limited to once per hour per workspace. Cleans up items older than 24h.
 * Fetches last 7 days from all public channels (max 100 msgs/channel).
 * Excludes bot messages.
 * Never throws — returns counts.
 */
export async function syncSlackContext(
  workspaceId: string
): Promise<SyncSlackContextResult> {
  const result: SyncSlackContextResult = { synced: 0, channels: 0 }

  try {
    const integration = await getSlackIntegration(workspaceId)
    if (!integration) return result

    // Rate limit: check most recent stored item
    const lastItem = await prisma.contextItem.findFirst({
      where: { workspaceId, type: SLACK_MESSAGE_TYPE },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    })

    if (lastItem && Date.now() - lastItem.updatedAt.getTime() < SYNC_COOLDOWN_MS) {
      logger.debug('[SlackSync] Skipping — last sync too recent', {
        workspaceId,
        lastSync: lastItem.updatedAt,
      })
      return result
    }

    const channels = await getSlackChannels(workspaceId)
    if (channels.length === 0) return result

    const oldest = Math.floor((Date.now() - SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000) / 1000)

    for (const channel of channels) {
      try {
        const messages = await getSlackChannelMessages(
          workspaceId,
          channel.id,
          MAX_MESSAGES_PER_CHANNEL,
          oldest
        )

        // Filter out bot messages (user field is empty or starts with B)
        const humanMessages = messages.filter(
          (msg) => msg.user && msg.user !== 'Unknown' && msg.text.trim().length > 0
        )

        for (const msg of humanMessages) {
          try {
            const contextId = `slack_${channel.id}_${msg.ts}`
            const title = `#${channel.name} — ${msg.user}`
            const summary = msg.text.slice(0, MAX_SUMMARY_CHARS)
            const itemData = {
              content: `#${channel.name} — ${msg.user}: ${msg.text}`,
              metadata: {
                channelId: channel.id,
                channelName: channel.name,
                userName: msg.user,
                userId: msg.userId,
                timestamp: msg.ts,
                threadTs: msg.threadTs,
                workspaceId,
              },
            }

            const existing = await prisma.contextItem.findFirst({
              where: { contextId, type: SLACK_MESSAGE_TYPE, workspaceId },
              select: { id: true },
            })

            if (existing) {
              await prisma.contextItem.update({
                where: { id: existing.id },
                data: { title, summary, data: itemData },
              })
            } else {
              await prisma.contextItem.create({
                data: {
                  contextId,
                  workspaceId,
                  type: SLACK_MESSAGE_TYPE,
                  title,
                  summary,
                  data: itemData,
                },
              })
            }

            result.synced++
          } catch (upsertErr) {
            logger.warn('[SlackSync] Failed to upsert message', {
              channelId: channel.id,
              ts: msg.ts,
              error: upsertErr instanceof Error ? upsertErr.message : String(upsertErr),
            })
          }
        }

        result.channels++
      } catch (channelErr) {
        logger.warn('[SlackSync] Failed to sync channel', {
          workspaceId,
          channelId: channel.id,
          channelName: channel.name,
          error: channelErr instanceof Error ? channelErr.message : String(channelErr),
        })
      }
    }

    // Clean up stale items older than 24h
    const cutoff = new Date(Date.now() - CONTEXT_TTL_MS)
    await prisma.contextItem.deleteMany({
      where: {
        workspaceId,
        type: SLACK_MESSAGE_TYPE,
        updatedAt: { lt: cutoff },
      },
    })

    logger.info('[SlackSync] Sync complete', {
      workspaceId,
      synced: result.synced,
      channels: result.channels,
    })
  } catch (error) {
    logger.warn('[SlackSync] Sync failed', {
      workspaceId,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return result
}

/**
 * Load Slack context from persisted ContextItems (populated by syncSlackContext).
 * Falls back to live fetch from all channels if no stored items exist.
 */
export async function loadSlackContextFromStore(
  workspaceId: string,
  limit = 50
): Promise<SlackStoredMessage[]> {
  try {
    const items = await prisma.contextItem.findMany({
      where: { workspaceId, type: SLACK_MESSAGE_TYPE },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })

    if (items.length > 0) {
      return items.map((item) => {
        const data = item.data as {
          metadata?: {
            channelId?: string
            channelName?: string
            userName?: string
            userId?: string
            timestamp?: string
            threadTs?: string
          }
        }
        return {
          channelId: data.metadata?.channelId ?? '',
          channelName: data.metadata?.channelName ?? '',
          userName: data.metadata?.userName ?? '',
          userId: data.metadata?.userId,
          text: item.summary ?? '',
          timestamp: data.metadata?.timestamp ?? '',
          threadTs: data.metadata?.threadTs,
        }
      })
    }

    // Fallback: live fetch from first few channels
    const integration = await getSlackIntegration(workspaceId)
    if (!integration) return []

    const channels = await getSlackChannels(workspaceId)
    const messages: SlackStoredMessage[] = []
    const channelsToFetch = channels.slice(0, 5) // limit fallback scope

    for (const channel of channelsToFetch) {
      try {
        const channelMsgs = await getSlackChannelMessages(workspaceId, channel.id, 20)
        for (const msg of channelMsgs) {
          if (msg.user && msg.user !== 'Unknown' && msg.text.trim().length > 0) {
            messages.push({
              channelId: channel.id,
              channelName: channel.name,
              userName: msg.user,
              userId: msg.userId,
              text: msg.text,
              timestamp: msg.ts,
              threadTs: msg.threadTs,
            })
          }
        }
      } catch {
        // Skip failing channels
      }
      if (messages.length >= limit) break
    }

    return messages.slice(0, limit)
  } catch (error) {
    logger.warn('[SlackContext] Failed to load from store', {
      workspaceId,
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

/**
 * Format stored Slack messages for inclusion in a Loopbrain prompt.
 * Returns empty string if no messages — caller should skip injection.
 */
export function formatSlackMessagesForPrompt(
  messages: SlackStoredMessage[]
): string {
  if (messages.length === 0) return ''

  let output = '[Slack Context - Recent Channel Messages]\n\n'
  let charCount = output.length

  // Group by channel for readability
  const byChannel = new Map<string, SlackStoredMessage[]>()
  for (const msg of messages) {
    const key = msg.channelName || msg.channelId
    if (!byChannel.has(key)) byChannel.set(key, [])
    byChannel.get(key)!.push(msg)
  }

  for (const [channelName, channelMsgs] of byChannel) {
    const header = `#${channelName}:\n`
    if (charCount + header.length > MAX_PROMPT_CHARS) break
    output += header
    charCount += header.length

    for (const msg of channelMsgs.slice(0, 20)) {
      const ts = new Date(parseFloat(msg.timestamp) * 1000)
      const dateStr = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const timeStr = ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const entry = `  ${msg.userName} (${dateStr} ${timeStr}): ${msg.text.slice(0, 300)}\n`

      if (charCount + entry.length > MAX_PROMPT_CHARS) break
      output += entry
      charCount += entry.length
    }

    output += '\n'
    charCount += 1
  }

  return output.trim()
}

/**
 * Delete all slack_message ContextItems for a workspace.
 * Used when workspace disconnects Slack integration.
 */
export async function deleteSlackContextForWorkspace(
  workspaceId: string
): Promise<number> {
  const result = await prisma.contextItem.deleteMany({
    where: { workspaceId, type: SLACK_MESSAGE_TYPE },
  })
  return result.count
}

// =============================================================================
// Tier B Types (non-persistent, request-time)
// =============================================================================

export interface SlackContextQuery {
  workspaceId: string
  slackChannelHints: string[]
  projectName?: string
  taskTitles?: string[]
  keywords?: string[]
  maxMessagesPerChannel?: number  // default ~50
}

export interface SlackMessageSummary {
  channel: string
  channelId?: string
  relevance: 'high' | 'medium' | 'low'
  summary: string
  messages: Array<{
    user: string
    userId?: string
    text: string
    ts: string
    threadTs?: string
    replies?: number
  }>
  messageCount: number
}

// Keep old interface for backward compatibility
export type SlackChannelContext = SlackMessageSummary

/**
 * Derive keywords from user question for filtering messages
 * Enhanced to detect when Slack queries are needed
 */
export function deriveKeywordsFromUserQuestion(
  question: string,
  projectName?: string,
  taskTitles?: string[]
): string[] {
  const lowerQuestion = question.toLowerCase()
  const keywords: string[] = []
  
  // Check if question suggests Slack could help
  const slackIndicators = [
    'slack', 'in slack', 'on slack', 'check slack', 'look in slack',
    'mentioned', 'discussion', 'conversation', 'chat', 'message'
  ]
  const shouldQuerySlack = slackIndicators.some(indicator => 
    lowerQuestion.includes(indicator)
  )
  
  // Common problem/blocker indicators
  const problemWords = [
    'blocked', 'block', 'error', 'issue', 'problem', 'bug', 'broken', 
    'fail', 'stuck', 'help', 'cannot', "can't", 'unable', 'stopped',
    'delay', 'delayed', 'waiting', 'dependency', 'blocking'
  ]
  problemWords.forEach(word => {
    if (lowerQuestion.includes(word)) {
      keywords.push(word)
    }
  })
  
  // Add project name if provided and mentioned
  if (projectName) {
    const projectLower = projectName.toLowerCase()
    if (lowerQuestion.includes(projectLower) || shouldQuerySlack) {
      keywords.push(projectLower)
      // Also add individual words from project name
      projectName.split(/\s+/).forEach(word => {
        if (word.length > 3) {
          keywords.push(word.toLowerCase())
        }
      })
    }
  }
  
  // Add task titles if provided
  if (taskTitles && taskTitles.length > 0) {
    taskTitles.forEach(title => {
      const titleLower = title.toLowerCase()
      if (lowerQuestion.includes(titleLower) || shouldQuerySlack) {
        keywords.push(titleLower)
        // Also add key words from task title
        title.split(/\s+/).forEach(word => {
          if (word.length > 3) {
            keywords.push(word.toLowerCase())
          }
        })
      }
    })
  }
  
  // Extract quoted strings or specific terms
  const quotedMatches = question.match(/"([^"]+)"/g)
  if (quotedMatches) {
    quotedMatches.forEach(match => {
      const term = match.replace(/"/g, '').trim()
      if (term.length > 2) {
        keywords.push(term.toLowerCase())
      }
    })
  }
  
  // Extract channel mentions (e.g., #loopbrain-architecture)
  const channelMatches = question.match(/#[\w-]+/g)
  if (channelMatches) {
    channelMatches.forEach(match => {
      keywords.push(match.toLowerCase().replace('#', ''))
    })
  }
  
  return Array.from(new Set(keywords))
}

/**
 * Filter messages by keywords, project name, and task titles
 * Prioritizes messages that match multiple criteria
 */
function filterMessagesByKeywords(
  messages: SlackChannelContext['messages'],
  keywords: string[],
  projectName?: string,
  taskTitles?: string[]
): SlackChannelContext['messages'] {
  if (keywords.length === 0 && !projectName && (!taskTitles || taskTitles.length === 0)) {
    return messages
  }
  
  const projectLower = projectName?.toLowerCase()
  const taskTitlesLower = taskTitles?.map(t => t.toLowerCase()) || []
  
  return messages.filter(msg => {
    const msgText = msg.text.toLowerCase()
    let matchCount = 0
    
    // Check keyword matches
    if (keywords.length > 0) {
      const keywordMatches = keywords.filter(keyword => 
        msgText.includes(keyword.toLowerCase())
      ).length
      matchCount += keywordMatches
    }
    
    // Check project name match (higher weight)
    if (projectLower && msgText.includes(projectLower)) {
      matchCount += 2
    }
    
    // Check task title matches (higher weight)
    if (taskTitlesLower.length > 0) {
      const taskMatches = taskTitlesLower.filter(title => 
        msgText.includes(title)
      ).length
      matchCount += taskMatches * 2
    }
    
    return matchCount > 0
  })
}

/**
 * Generate a simple summary of channel messages
 */
function generateChannelSummary(
  messages: SlackChannelContext['messages'],
  keywords: string[] = [],
  projectName?: string,
  taskTitles?: string[]
): string {
  if (messages.length === 0) {
    return 'No messages found in this channel.'
  }
  
  const filtered = filterMessagesByKeywords(messages, keywords, projectName, taskTitles)
  
  if (filtered.length === 0) {
    return `No messages match the search criteria. Total messages: ${messages.length}`
  }
  
  // Simple summary: mention count and recent activity
  const recentCount = Math.min(filtered.length, 20)
  const hasThreads = filtered.some(m => m.threadTs || (m.replies && m.replies > 0))
  
  let summary = `Found ${filtered.length} relevant message${filtered.length !== 1 ? 's' : ''}`
  if (recentCount < filtered.length) {
    summary += ` (showing ${recentCount} most recent)`
  }
  if (hasThreads) {
    summary += '. Contains threaded discussions.'
  }
  
  // Add context about what was matched
  if (projectName) {
    summary += ` Mentions project: ${projectName}.`
  }
  if (taskTitles && taskTitles.length > 0) {
    summary += ` Mentions ${taskTitles.length} task(s).`
  }
  
  return summary
}

/**
 * Get Slack context for a project
 * 
 * Fetches messages from channels specified in slackChannelHints,
 * filters by project name, task titles, and keywords, then returns structured context.
 * 
 * Steps:
 * 1) Resolve channel IDs from slackChannelHints using existing Slack client
 * 2) For each channel: Fetch the last N messages (maxMessagesPerChannel, default ~50)
 * 3) Filter messages:
 *    - If projectName provided, prefer messages that mention it
 *    - If taskTitles provided, prefer messages that mention any title
 *    - Prefer messages containing "block", "blocked", "issue", "error", "cannot", etc.
 * 4) Summarize per channel:
 *    - Simple summarization (concatenation of relevant messages)
 *    - Set relevance = "high" if many matches / direct task mentions,
 *      "medium" if some matches, "low" otherwise
 * 5) Return an array of SlackMessageSummary sorted by relevance desc.
 */
export async function getSlackContextForProject(
  query: SlackContextQuery
): Promise<SlackMessageSummary[]> {
  const { 
    workspaceId, 
    slackChannelHints, 
    projectName,
    taskTitles,
    keywords = [], 
    maxMessagesPerChannel = 50 
  } = query
  
  if (!slackChannelHints || slackChannelHints.length === 0) {
    return []
  }
  
  const results: SlackChannelContext[] = []
  
  try {
    // Get all channels to resolve names to IDs
    let allChannels: Array<{ id: string; name: string }> = []
    try {
      allChannels = await getSlackChannels(workspaceId)
    } catch (error) {
      logger.warn('Failed to fetch Slack channels list', {
        workspaceId,
        error: error instanceof Error ? error.message : String(error)
      })
      // Continue with channel names as-is
    }
    
    // Process each channel hint
    for (const channelHint of slackChannelHints) {
      try {
        // Normalize channel name (remove # prefix if present)
        const channelName = channelHint.replace(/^#/, '').trim()
        
        // Try to resolve channel ID
        let channelId: string | undefined
        const foundChannel = allChannels.find(c => 
          c.name.toLowerCase() === channelName.toLowerCase()
        )
        if (foundChannel) {
          channelId = foundChannel.id
        }
        
        // Fetch messages (use channel name or ID)
        const channelIdentifier = channelId || `#${channelName}`
        const messages = await getSlackChannelMessages(
          workspaceId,
          channelIdentifier,
          maxMessagesPerChannel
        )
        
        // Filter by keywords, project name, and task titles
        const filteredMessages = filterMessagesByKeywords(
          messages, 
          keywords, 
          projectName, 
          taskTitles
        )
        
        // Determine relevance based on match quality
        let relevance: 'high' | 'medium' | 'low' = 'low'
        if (filteredMessages.length === 0) {
          relevance = 'low'
        } else {
          // Count high-value matches (project name or task titles)
          const highValueMatches = filteredMessages.filter(msg => {
            const msgText = msg.text.toLowerCase()
            const hasProject = projectName && msgText.includes(projectName.toLowerCase())
            const hasTask = taskTitles && taskTitles.some(title => 
              msgText.includes(title.toLowerCase())
            )
            return hasProject || hasTask
          }).length
          
          if (highValueMatches > 0 || filteredMessages.length >= 5) {
            relevance = 'high'
          } else if (filteredMessages.length >= 2) {
            relevance = 'medium'
          } else {
            relevance = 'low'
          }
        }
        
        // Generate summary
        const summary = generateChannelSummary(messages, keywords, projectName, taskTitles)
        
        // Format messages for response (add permalink if possible)
        const formattedMessages = filteredMessages.slice(0, maxMessagesPerChannel).map(msg => ({
          ts: msg.ts,
          user: msg.user,
          text: msg.text,
          permalink: channelId ? `https://slack.com/archives/${channelId}/p${msg.ts.replace('.', '')}` : undefined
        }))
        
        results.push({
          channel: `#${channelName}`,
          channelId,
          relevance,
          summary,
          messages: formattedMessages,
          messageCount: messages.length
        })
        
        logger.info('Fetched Slack context for channel', {
          workspaceId,
          channel: channelName,
          messageCount: messages.length,
          filteredCount: filteredMessages.length,
          relevance
        })
      } catch (error) {
        logger.warn('Failed to fetch messages for Slack channel', {
          workspaceId,
          channel: channelHint,
          error: error instanceof Error ? error.message : String(error)
        })
        // Continue with other channels even if one fails
      }
    }
  } catch (error) {
    logger.error('Failed to get Slack context for project', {
      workspaceId,
      error: error instanceof Error ? error.message : String(error)
    })
    // Return partial results if available
  }
  
  // Sort by relevance (high -> medium -> low), then by message count
  return results.sort((a, b) => {
    const relevanceOrder = { high: 3, medium: 2, low: 1 }
    const relevanceDiff = relevanceOrder[b.relevance] - relevanceOrder[a.relevance]
    if (relevanceDiff !== 0) return relevanceDiff
    return b.messageCount - a.messageCount
  })
}

