import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateAIResponse } from '@/lib/ai/providers'

// Function to generate smart chat titles
async function generateChatTitle(userMessage: string, aiResponse: string): Promise<string> {
  try {
    const titlePrompt = `Generate a concise, descriptive title (max 6 words) for a chat conversation based on this exchange:

User: ${userMessage}
AI: ${aiResponse.substring(0, 200)}...

The title should:
- Be descriptive and specific to the topic
- Use title case (capitalize important words)
- Be 2-6 words maximum
- Focus on the main subject or question
- Avoid generic words like "question", "help", "about"

Examples of good titles:
- "Loopwell Product Overview"
- "Project Management Features"
- "Wiki Documentation Help"
- "Team Onboarding Process"
- "AI Model Comparison"

Generate only the title, nothing else:`

    const titleResponse = await generateAIResponse(
      titlePrompt,
      'gpt-4o-mini', // Use a fast, cheap model for title generation
      {
        temperature: 0.3, // Low temperature for consistent results
        maxTokens: 20
      }
    )

    // Clean up the response and ensure it's a proper title
    let title = titleResponse.content.trim()
    
    // Remove quotes if present
    title = title.replace(/^["']|["']$/g, '')
    
    // Ensure it's not too long
    if (title.length > 50) {
      title = title.substring(0, 47) + '...'
    }
    
    // Fallback to a simple title if AI fails
    if (!title || title.length < 3) {
      const words = userMessage.split(' ').slice(0, 4)
      title = words.join(' ').replace(/[^\w\s]/g, '')
      if (title.length > 30) {
        title = title.substring(0, 27) + '...'
      }
    }
    
    return title
  } catch (error) {
    console.error('Error generating chat title:', error)
    // Fallback to simple title generation
    const words = userMessage.split(' ').slice(0, 4)
    let fallbackTitle = words.join(' ').replace(/[^\w\s]/g, '')
    if (fallbackTitle.length > 30) {
      fallbackTitle = fallbackTitle.substring(0, 27) + '...'
    }
    return fallbackTitle || 'New Chat'
  }
}

// POST /api/ai/chat-sessions/[id]/regenerate-title - Regenerate title for existing chat
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const sessionId = resolvedParams.id

    // Get the chat session
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId }
    })

    if (!chatSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get the first user message and AI response
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 2 // Get first user message and AI response
    })

    if (messages.length < 2) {
      return NextResponse.json({ error: 'Not enough messages to generate title' }, { status: 400 })
    }

    const userMessage = messages.find(m => m.type === 'USER')?.content
    const aiMessage = messages.find(m => m.type === 'AI')?.content

    if (!userMessage || !aiMessage) {
      return NextResponse.json({ error: 'Could not find user and AI messages' }, { status: 400 })
    }

    console.log('🎯 Regenerating title for existing chat...')
    const newTitle = await generateChatTitle(userMessage, aiMessage)
    console.log('📝 New title:', newTitle)

    // Update the session with the new title
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { 
        title: newTitle,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      title: newTitle
    })

  } catch (error) {
    console.error('Error regenerating chat title:', error)
    return NextResponse.json({
      error: 'Failed to regenerate title',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
