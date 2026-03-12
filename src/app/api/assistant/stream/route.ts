import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { AssistantStreamSchema } from '@/lib/validations/assistant'

// Lazy initialization - only create client when needed
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return null
  }
  return new OpenAI({ apiKey })
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const body = AssistantStreamSchema.parse(await request.json())
    const { message, sessionId } = body

    if (!message || !sessionId) {
      return NextResponse.json({ error: 'Message and session ID required' }, { status: 400 })
    }

    // Create a streaming response
    const openai = getOpenAIClient()
    if (!openai) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 503 })
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (!openai) {
            controller.error(new Error('OpenAI client not available'))
            return
          }
          const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
              { role: "system", content: "You are Loopwell AI, a helpful assistant." },
              { role: "user", content: message }
            ],
            stream: true,
            temperature: 0.7,
            max_tokens: 2000,
          })

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`))
            }
          }
          
          controller.close()
        } catch (error: unknown) {
          controller.error(error)
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
  } catch (error: unknown) {
    console.error('Streaming error:', error)
    return NextResponse.json({ error: 'Streaming failed' }, { status: 500 })
  }
}
