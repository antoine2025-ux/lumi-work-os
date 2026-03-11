/**
 * On-Demand Slack Search for Loopbrain
 *
 * Searches workspace Slack channels for messages matching a natural-language
 * query. Results are ephemeral — used only for the current LLM call, never
 * stored.
 *
 * Since the bot token doesn't have `search:read` scope, we use
 * `conversations.history` on each connected channel and filter client-side
 * by keywords. This avoids requiring existing workspaces to re-authorize.
 *
 * Max 20 results per query. Context text capped at ~2000 tokens.
 */

import { getSlackChannelMessages, getSlackChannels, getSlackIntegration } from '@/lib/integrations/slack-service'
import { logger } from '@/lib/logger'

// =============================================================================
// Constants
// =============================================================================

const MAX_SEARCH_RESULTS = 20
const MAX_CONTEXT_CHARS = 8000 // ~2000 tokens at ~4 chars/token
const MAX_CHANNELS_TO_SEARCH = 10
const MESSAGES_PER_CHANNEL = 100

const INTENT_PREFIXES = [
  /^what(?:'s| is| are) (?:happening|going on|being discussed|the team discussing) in\s*/i,
  /^(?:check|look at|look in|search|find in)\s+(?:the\s+)?(?:slack|#)/i,
  /^(?:show me|get)\s+(?:the\s+)?(?:slack|#)\s*/i,
  /^(?:what did|what has)\s+\S+\s+(?:say|post|write|mention)\s*(?:in|on)?\s*(?:slack)?\s*/i,
  /^slack\s+(?:messages?|threads?|conversations?)\s*(?:about|from|in|on)?\s*/i,
]

// =============================================================================
// Types
// =============================================================================

export interface SlackSearchResult {
  messages: Array<{
    channelId: string
    channelName: string
    userName: string
    userId?: string
    text: string
    timestamp: string
    threadTs?: string
  }>
  contextText: string
  searchQuery: string
  targetChannel?: string
}

// =============================================================================
// Query extraction
// =============================================================================

/**
 * Extract a search query and optional channel target from a natural language
 * question.
 *
 * "what's happening in #engineering?" → { channel: "engineering", keywords: [] }
 * "what did Sarah post in slack about the launch?" → { keywords: ["sarah", "launch"] }
 * "slack messages about deployment" → { keywords: ["deployment"] }
 */
export function extractSlackSearchQuery(naturalQuery: string): {
  channel?: string
  keywords: string[]
} {
  let q = naturalQuery.trim()

  // Extract #channel mention
  const channelMatch = q.match(/#([\w-]+)/)
  const channel = channelMatch?.[1]?.toLowerCase()

  // Strip intent prefixes
  for (const pattern of INTENT_PREFIXES) {
    const match = q.match(pattern)
    if (match) {
      q = q.replace(pattern, '').trim()
      break
    }
  }

  // Remove channel mention from remaining query
  q = q.replace(/#[\w-]+/g, '').trim()

  // Clean up trailing punctuation and filler words
  q = q.replace(/[?!.]+$/, '').trim()
  q = q.replace(/^(the|a|an|my|our|in|on|about|from|regarding)\s+/gi, '').trim()

  // Split into keywords, filter short/stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'about', 'it', 'its',
    'and', 'or', 'but', 'not', 'no', 'so', 'if', 'then', 'than', 'that',
    'this', 'what', 'which', 'who', 'whom', 'how', 'when', 'where', 'why',
    'slack', 'channel', 'thread', 'message', 'messages', 'posted', 'said',
    'team', 'discussing', 'happening',
  ])

  const keywords = q
    .split(/\s+/)
    .map((w) => w.toLowerCase().replace(/[^a-z0-9-]/g, ''))
    .filter((w) => w.length > 2 && !stopWords.has(w))

  return { channel, keywords: Array.from(new Set(keywords)) }
}

// =============================================================================
// Main search
// =============================================================================

/**
 * Search Slack channels for messages matching a user's natural-language query.
 *
 * Returns ephemeral context — no permanent storage.
 */
export async function searchSlackMessages(
  workspaceId: string,
  query: string,
  maxResults = MAX_SEARCH_RESULTS
): Promise<SlackSearchResult> {
  const { channel: targetChannel, keywords } = extractSlackSearchQuery(query)

  logger.info('[SlackSearch] Searching', {
    workspaceId,
    originalQuery: query,
    targetChannel,
    keywords,
    maxResults,
  })

  const integration = await getSlackIntegration(workspaceId)
  if (!integration) {
    return { messages: [], contextText: '', searchQuery: query }
  }

  const allChannels = await getSlackChannels(workspaceId)
  if (allChannels.length === 0) {
    return { messages: [], contextText: '', searchQuery: query }
  }

  // Determine which channels to search
  let channelsToSearch: Array<{ id: string; name: string }>
  if (targetChannel) {
    const found = allChannels.find(
      (c) => c.name.toLowerCase() === targetChannel.toLowerCase()
    )
    channelsToSearch = found ? [found] : []
  } else {
    channelsToSearch = allChannels.slice(0, MAX_CHANNELS_TO_SEARCH)
  }

  const allMessages: SlackSearchResult['messages'] = []

  for (const ch of channelsToSearch) {
    try {
      const msgs = await getSlackChannelMessages(workspaceId, ch.id, MESSAGES_PER_CHANNEL)

      for (const msg of msgs) {
        if (!msg.user || msg.user === 'Unknown' || !msg.text.trim()) continue

        // If we have keywords, filter; otherwise return all (for channel-specific queries)
        if (keywords.length > 0) {
          const textLower = msg.text.toLowerCase()
          const userLower = msg.user.toLowerCase()
          const hasMatch = keywords.some(
            (kw) => textLower.includes(kw) || userLower.includes(kw)
          )
          if (!hasMatch) continue
        }

        allMessages.push({
          channelId: ch.id,
          channelName: ch.name,
          userName: msg.user,
          userId: msg.userId,
          text: msg.text,
          timestamp: msg.ts,
          threadTs: msg.threadTs,
        })
      }
    } catch (err: unknown) {
      logger.warn('[SlackSearch] Failed to search channel', {
        workspaceId,
        channelId: ch.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Sort by timestamp descending (most recent first)
  allMessages.sort((a, b) => parseFloat(b.timestamp) - parseFloat(a.timestamp))

  const trimmed = allMessages.slice(0, maxResults)
  const contextText = formatSlackSearchResultsForLLM(trimmed)

  return { messages: trimmed, contextText, searchQuery: query, targetChannel }
}

// =============================================================================
// LLM context formatter
// =============================================================================

function formatSlackSearchResultsForLLM(
  messages: SlackSearchResult['messages']
): string {
  if (messages.length === 0) return ''

  let output = '[Slack Context - Search Results]\n\n'
  let charCount = output.length

  // Group by channel
  const byChannel = new Map<string, typeof messages>()
  for (const msg of messages) {
    if (!byChannel.has(msg.channelName)) byChannel.set(msg.channelName, [])
    byChannel.get(msg.channelName)!.push(msg)
  }

  for (const [channelName, channelMsgs] of byChannel) {
    const header = `#${channelName}:\n`
    if (charCount + header.length > MAX_CONTEXT_CHARS) break
    output += header
    charCount += header.length

    for (const msg of channelMsgs) {
      const ts = new Date(parseFloat(msg.timestamp) * 1000)
      const dateStr = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const timeStr = ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const entry = `  ${msg.userName} (${dateStr} ${timeStr}): ${msg.text.slice(0, 400)}\n`

      if (charCount + entry.length > MAX_CONTEXT_CHARS) break
      output += entry
      charCount += entry.length
    }

    output += '\n'
    charCount += 1
  }

  return output.trim()
}
