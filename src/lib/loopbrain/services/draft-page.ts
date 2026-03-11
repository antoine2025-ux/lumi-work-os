/**
 * Draft Page Service — generates LLM content and writes it to a wiki page.
 *
 * Primary path: DB-only write (direct Prisma update with generated markdown).
 * Hocuspocus streaming path: opt-in via DRAFT_USE_HOCUSPOCUS=true env var
 * (disabled by default until the Yjs dual-import issue is resolved).
 *
 * Called as a fire-and-forget background task after the agent loop returns
 * a redirect response. The user navigates to the blank page and sees content
 * once this completes.
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
 * Generate wiki page content via LLM and persist it to the WikiPage record.
 *
 * Default: writes directly to DB (DB-only path, no Hocuspocus dependency).
 * Set DRAFT_USE_HOCUSPOCUS=true to enable the real-time Yjs streaming path.
 *
 * This function is designed to be called with `void streamDraftToPage(...)`
 * — it handles its own errors internally and never throws.
 */
export async function streamDraftToPage(params: StreamDraftParams): Promise<void> {
  const { pageId, workspaceId, topic, userId } = params
  const useHocuspocus = process.env.DRAFT_USE_HOCUSPOCUS === 'true'

  if (useHocuspocus) {
    await streamViaHocuspocus(params)
  } else {
    await writeDirectlyToDB(params)
  }
}

// ---------------------------------------------------------------------------
// DB-only path (primary)
// ---------------------------------------------------------------------------

async function writeDirectlyToDB(params: StreamDraftParams): Promise<void> {
  const { pageId, workspaceId, topic, outline } = params

  try {
    // 1. Generate content via LLM
    const prompt = buildDraftPrompt(topic, outline)
    const provider = getProvider(DRAFT_MODEL)

    const response = await provider.generateResponse(prompt, DRAFT_MODEL, {
      maxTokens: 4000,
      temperature: 0.7,
    })

    const content = response.content
    if (!content || content.startsWith('AI features are disabled')) {
      logger.warn('[DraftPage][db] LLM returned empty or disabled response', { pageId, topic, response: content?.slice(0, 100) })
      return
    }

    // 2. Persist to DB
    setWorkspaceContext(workspaceId)
    await prisma.wikiPage.update({
      where: { id: pageId },
      data: { content },
    })

    logger.info('[DraftPage][db] Draft page DB write complete', { pageId, topic, contentLength: content.length })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    logger.error('[DraftPage][db] Draft page DB write failed', { pageId, topic, error: msg })
  }
}

// ---------------------------------------------------------------------------
// Hocuspocus streaming path (opt-in via DRAFT_USE_HOCUSPOCUS=true)
// ---------------------------------------------------------------------------

async function streamViaHocuspocus(params: StreamDraftParams): Promise<void> {
  const { pageId, workspaceId, topic, outline, userId } = params
  const writer = new LoopbrainDocumentWriter()

  try {
    // 1. Connect
    await writer.connect(pageId, userId)

    // 2. Generate content
    const prompt = buildDraftPrompt(topic, outline)
    const provider = getProvider(DRAFT_MODEL)

    const response = await provider.generateResponse(prompt, DRAFT_MODEL, {
      maxTokens: 4000,
      temperature: 0.7,
    })

    const content = response.content
    if (!content || content.startsWith('AI features are disabled')) {
      logger.warn('[DraftPage][hocuspocus] LLM returned empty or disabled response', { pageId, topic })
      return
    }

    // 3. Stream into Hocuspocus document section-by-section
    const lines = content.split('\n')
    let bulletBuffer: string[] = []

    for (const line of lines) {
      if (bulletBuffer.length > 0 && !isBulletLine(line)) {
        await writer.insertBulletList(bulletBuffer)
        bulletBuffer = []
        await delay(INSERT_DELAY_MS)
      }

      const trimmed = line.trimEnd()

      if (trimmed.startsWith('### ')) {
        await writer.insertHeading(trimmed.slice(4), 3)
        await delay(INSERT_DELAY_MS)
      } else if (trimmed.startsWith('## ')) {
        await writer.insertHeading(trimmed.slice(3), 2)
        await delay(INSERT_DELAY_MS)
      } else if (trimmed.startsWith('# ')) {
        await writer.insertHeading(trimmed.slice(2), 1)
        await delay(INSERT_DELAY_MS)
      } else if (isBulletLine(trimmed)) {
        bulletBuffer.push(trimmed.replace(/^[-*]\s+/, ''))
      } else if (trimmed === '') {
        await writer.insertParagraph('')
        await delay(INSERT_DELAY_MS)
      } else {
        await writer.insertParagraph(trimmed)
        await delay(INSERT_DELAY_MS)
      }
    }

    if (bulletBuffer.length > 0) {
      await writer.insertBulletList(bulletBuffer)
    }

    // 4. Persist markdown to DB as fallback (Hocuspocus onStoreDocument is primary)
    setWorkspaceContext(workspaceId)
    await prisma.wikiPage.update({
      where: { id: pageId },
      data: { content },
    })

    logger.info('[DraftPage][hocuspocus] Streaming complete', { pageId, topic, lineCount: lines.length })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error('[DraftPage][hocuspocus] Streaming failed', { pageId, topic, error: msg })

    // Any failure in the Hocuspocus path falls back to direct DB write
    try {
      const prompt = buildDraftPrompt(topic, outline)
      const provider = getProvider(DRAFT_MODEL)
      const response = await provider.generateResponse(prompt, DRAFT_MODEL, {
        maxTokens: 4000,
        temperature: 0.7,
      })

      if (response.content && !response.content.startsWith('AI features are disabled')) {
        setWorkspaceContext(workspaceId)
        await prisma.wikiPage.update({
          where: { id: pageId },
          data: { content: response.content },
        })
        logger.info('[DraftPage][hocuspocus] DB fallback succeeded', { pageId, contentLength: response.content.length })
      } else {
        logger.warn('[DraftPage][hocuspocus] DB fallback: LLM returned empty or disabled response', { pageId })
      }
    } catch (fallbackError: unknown) {
      const fbMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      logger.error('[DraftPage][hocuspocus] DB fallback also failed', { pageId, error: fbMsg })
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
