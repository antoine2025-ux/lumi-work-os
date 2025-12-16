import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { generateAIStream, getProvider } from '@/lib/ai/providers'
import { cache, CACHE_KEYS } from '@/lib/cache'
import { getUnifiedAuth } from '@/lib/unified-auth'

// POST /api/ai/chat/stream - Stream chat response
export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    const { message, sessionId, model = 'gpt-4-turbo' } = await request.json()

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get chat session
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId }
    })

    if (!chatSession) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get conversation history (limit to last 10 for faster context loading)
    const chatMessages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 10
    })

    const workspaceId = chatSession.workspaceId

    // Get context in parallel (non-blocking, can be cached)
    const contextPromise = cache.cacheWorkspaceData(
      cache.generateKey(CACHE_KEYS.AI_CONTEXT, workspaceId, 'chat'),
      workspaceId,
      async () => {
        const [wikiPages] = await Promise.all([
          prisma.wikiPage.findMany({
            where: { workspaceId, isPublished: true },
            select: { id: true, title: true, excerpt: true },
            take: 10,
            orderBy: { updatedAt: 'desc' }
          })
        ])
        return { wikiPages }
      }
    )

    // Build conversation history
    const conversationHistory = chatMessages.map(msg => ({
      role: msg.type === 'USER' ? 'user' : 'assistant',
      content: msg.content
    }))

    // Simplified system prompt for faster responses
    const systemPrompt = `You are Loopwell's AI assistant. Help users with questions about their workspace, wiki pages, projects, and tasks. Be concise and helpful.`

    // Save user message immediately (non-blocking)
    const saveUserMessagePromise = prisma.chatMessage.create({
      data: {
        sessionId,
        type: 'USER',
        content: message
      }
    })

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = ''
        let saveAIMessagePromise: Promise<any> | null = null

        try {
          // Start streaming immediately
          let streamGenerator: AsyncGenerator<string, void, unknown>
          
          try {
            streamGenerator = generateAIStream(message, model, {
              systemPrompt,
              conversationHistory,
              temperature: 0.7,
              maxTokens: 2000
            })
          } catch (streamError) {
            // If streaming fails, fall back to non-streaming for certain models
            console.warn('Streaming failed, falling back to non-streaming:', streamError)
            const { generateAIResponse } = await import('@/lib/ai/providers')
            const response = await generateAIResponse(message, model, {
              systemPrompt,
              conversationHistory,
              temperature: 0.7,
              maxTokens: 2000
            })
            fullContent = response.content
            // Send the full response as a single chunk
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ content: fullContent, done: true })}\n\n`)
            )
            controller.close()
            return
          }

          // Stream chunks as they arrive
          for await (const chunk of streamGenerator) {
            fullContent += chunk
            // Send chunk to client
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`)
            )
          }

          // Wait for context and user message save (non-blocking, but ensure they complete)
          await Promise.all([contextPromise, saveUserMessagePromise])

          // Save AI response
          saveAIMessagePromise = prisma.chatMessage.create({
            data: {
              sessionId,
              type: 'AI',
              content: fullContent,
              metadata: {
                model: model,
                streaming: true
              } as any
            }
          })

          // Update session timestamp
          await Promise.all([
            saveAIMessagePromise,
            prisma.chatSession.update({
              where: { id: sessionId },
              data: { updatedAt: new Date() }
            })
          ])

          // Send completion signal
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ content: '', done: true, fullContent })}\n\n`)
          )
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', done: true })}\n\n`)
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
    console.error('Error in streaming chat:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to start streaming',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

