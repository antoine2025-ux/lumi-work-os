/**
 * Slack Context Provider (Tier B)
 * 
 * Fetches Slack messages from channels specified in project slackChannelHints.
 * This is a non-persistent, request-time context provider that enriches
 * Loopbrain's understanding with real-time Slack conversations.
 * 
 * EXISTING SLACK INTEGRATION:
 * - Slack client: src/lib/integrations/slack-service.ts
 * - Functions used:
 *   - getSlackChannels(workspaceId): Promise<Array<{ id: string; name: string }>>
 *   - getSlackChannelMessages(workspaceId, channel, limit, oldest?, latest?): Promise<Array<{user, text, ts, ...}>>
 * - These functions handle:
 *   - OAuth token management (getValidAccessToken)
 *   - Channel name to ID resolution
 *   - User ID to name resolution
 *   - API error handling
 */

import { getSlackChannelMessages, getSlackChannels } from '@/lib/integrations/slack-service'
import { logger } from '@/lib/logger'

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
    ts: string
    user?: string
    text: string
    permalink?: string
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

