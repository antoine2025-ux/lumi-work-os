import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { generateAIStream } from '@/lib/ai/providers'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'

// POST /api/ai/draft-page - Stream content generation for a specific page
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    const { pageId, prompt, workspaceId } = await request.json()

    if (!pageId || !prompt) {
      return new Response(JSON.stringify({ error: 'Page ID and prompt are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Set workspace context
    setWorkspaceContext(workspaceId || auth.workspaceId)

    // Get page info
    const page = await prisma.wikiPage.findUnique({
      where: { id: pageId },
      select: {
        id: true,
        title: true,
        content: true,
        workspaceId: true
      }
    })

    if (!page) {
      return new Response(JSON.stringify({ error: 'Page not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Build system prompt for page drafting
    const systemPrompt = `You are Loopwell's Contextual Spaces AI. You are drafting content for a wiki page.

CURRENT PAGE:
Title: "${page.title}"
Current Content: ${page.content ? page.content.substring(0, 500) + '...' : '(empty page)'}

YOUR JOB:
Generate fully formatted Markdown content for this page based on the user's request.

OUTPUT RULES:
1. Always output valid Markdown for the page content.
2. Use "#", "##", "###" for headings, with blank lines between blocks.
3. Use bullet points and numbered lists where helpful.
4. Do NOT wrap the content in code fences.
5. Return ONLY the document content - no meta commentary.
6. Start with an H1 title if the page is empty, otherwise use H2 for sections.
7. Generate substantial, useful content - never return empty or minimal responses.

The content you generate will be inserted directly into the page editor.`

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = ''

        try {
          // Stream AI response
          const streamGenerator = generateAIStream(prompt, 'gpt-4-turbo', {
            systemPrompt,
            conversationHistory: [],
            temperature: 0.7,
            maxTokens: 4000
          })

          // Stream chunks as they arrive
          for await (const chunk of streamGenerator) {
            fullContent += chunk
            // Send chunk to client
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`)
            )
          }

          // Update page content with full generated content
          await prisma.wikiPage.update({
            where: { id: pageId },
            data: {
              content: fullContent.trim(),
              updatedAt: new Date()
            }
          })

          // Send completion signal
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          )
          controller.close()
        } catch (error) {
          console.error('Error streaming page draft:', error)
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Streaming failed' })}\n\n`)
          )
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in draft-page endpoint:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}



