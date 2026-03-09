/**
 * Draft Page Service — streams LLM-generated content into a wiki page
 * via the Hocuspocus document writer.
 *
 * Called as a fire-and-forget background task after the agent loop returns
 * a redirect response. The user navigates to the blank page and sees content
 * appear progressively in the TipTap editor.
 */
import { LoopbrainDocumentWriter } from './document-writer'
import { getProvider } from '@/lib/ai/providers'
import { prisma } from '@/lib/db'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { logger } from '@/lib/logger'

const DRAFT_MODEL = process.env.LOOPBRAIN_MODEL || 'claude-sonnet-4-6'

/** Delay between document operations so the user sees progressive insertion */
const INSERT_DELAY_MS = 80

export interface StreamDraftParams {
  pageId: string
  workspaceId: string
  topic: string
  outline?: string[]
  userId: string
}

/**
 * Generate wiki page content via LLM and stream it into the Hocuspocus
 * document in real time. Saves the final content to the WikiPage record
 * as a persistence fallback.
 *
 * This function is designed to be called with `void streamDraftToPage(...)`
 * — it handles its own errors internally and never throws.
 */
export async function streamDraftToPage(params: StreamDraftParams): Promise<void> {
  const { pageId, workspaceId, topic, outline, userId } = params

  console.log('[DraftPage] Starting streamDraftToPage', { pageId, workspaceId, topic, userId })

  const writer = new LoopbrainDocumentWriter()

  try {
    // 1. Connect to the page's Hocuspocus document (userId as auth token)
    console.log('[DraftPage] Connecting to Hocuspocus...')
    await writer.connect(pageId, userId)
    console.log('[DraftPage] Connected to Hocuspocus successfully')

    // 2. Generate the full draft via LLM
    const systemPrompt = buildDraftPrompt(topic, outline)
    const provider = getProvider(DRAFT_MODEL)
    console.log('[DraftPage] Calling LLM with model:', DRAFT_MODEL)
    const response = await provider.generateResponse(systemPrompt, DRAFT_MODEL, {
      maxTokens: 4000,
      temperature: 0.7,
    })
    console.log('[DraftPage] LLM response received, content length:', response.content?.length ?? 0)

    const content = response.content
    if (!content) {
      logger.warn('Draft LLM returned empty content', { pageId, topic })
      return
    }

    // 3. Parse the markdown and insert section-by-section with delays
    const lines = content.split('\n')
    let bulletBuffer: string[] = []

    for (const line of lines) {
      // Flush any buffered bullet items when we hit a non-bullet line
      if (bulletBuffer.length > 0 && !isBulletLine(line)) {
        await writer.insertBulletList(bulletBuffer)
        bulletBuffer = []
        await delay(INSERT_DELAY_MS)
      }

      const trimmed = line.trimEnd()

      // Headings
      if (trimmed.startsWith('### ')) {
        await writer.insertHeading(trimmed.slice(4), 3)
        await delay(INSERT_DELAY_MS)
      } else if (trimmed.startsWith('## ')) {
        await writer.insertHeading(trimmed.slice(3), 2)
        await delay(INSERT_DELAY_MS)
      } else if (trimmed.startsWith('# ')) {
        await writer.insertHeading(trimmed.slice(2), 1)
        await delay(INSERT_DELAY_MS)
      }
      // Bullet items — buffer consecutive lines
      else if (isBulletLine(trimmed)) {
        bulletBuffer.push(trimmed.replace(/^[-*]\s+/, ''))
      }
      // Blank lines
      else if (trimmed === '') {
        await writer.insertParagraph('')
        await delay(INSERT_DELAY_MS)
      }
      // Regular paragraphs
      else {
        await writer.insertParagraph(trimmed)
        await delay(INSERT_DELAY_MS)
      }
    }

    // Flush remaining bullets
    if (bulletBuffer.length > 0) {
      await writer.insertBulletList(bulletBuffer)
    }

    // 4. Save the markdown as a plain-text fallback in the content field.
    //    The primary persistence path is Hocuspocus onStoreDocument which
    //    converts the Yjs doc → ProseMirror JSON → contentJson. This is a
    //    safety net in case the collab server misses the save window.
    setWorkspaceContext(workspaceId)
    await prisma.wikiPage.update({
      where: { id: pageId },
      data: { content },
    })

    logger.info('Draft page streaming complete', { pageId, topic, lineCount: lines.length })
  } catch (error: unknown) {
    // Fire-and-forget — log but don't propagate
    console.error('[DraftPage] Draft page streaming failed:', error)
    logger.error('Draft page streaming failed', { pageId, topic }, error)

    // Fallback: if Hocuspocus failed but we can still generate content, save directly to DB
    try {
      const isConnectionError = error instanceof Error && error.message.includes('Hocuspocus')
      if (isConnectionError) {
        console.log('[DraftPage] Hocuspocus failed — attempting DB-only fallback')
        const systemPrompt = buildDraftPrompt(topic, outline)
        const provider = getProvider(DRAFT_MODEL)
        const response = await provider.generateResponse(systemPrompt, DRAFT_MODEL, {
          maxTokens: 4000,
          temperature: 0.7,
        })
        if (response.content) {
          setWorkspaceContext(workspaceId)
          await prisma.wikiPage.update({
            where: { id: pageId },
            data: { content: response.content },
          })
          console.log('[DraftPage] DB-only fallback succeeded', { pageId, contentLength: response.content.length })
        }
      }
    } catch (fallbackError) {
      console.error('[DraftPage] DB-only fallback also failed:', fallbackError)
    }
  } finally {
    await writer.disconnect()
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDraftPrompt(topic: string, outline?: string[]): string {
  let prompt = `Write a well-structured wiki page about the following topic:

**Topic:** ${topic}

Write in markdown format. Use clear headings (## for main sections, ### for subsections), bullet lists where appropriate, and concise paragraphs. The page should be professional, informative, and ready to publish as internal documentation.

Do NOT include a title heading (# Title) — the page already has a title. Start directly with the content.`

  if (outline && outline.length > 0) {
    prompt += `\n\nInclude the following sections:\n${outline.map((s) => `- ${s}`).join('\n')}`
  }

  return prompt
}

function isBulletLine(line: string): boolean {
  return /^[-*]\s+/.test(line.trim())
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
