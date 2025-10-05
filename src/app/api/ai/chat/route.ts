import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// POST /api/ai/chat - Chat with AI assistant
export async function POST(request: NextRequest) {
  try {
    // For development, bypass session check
    // TODO: Implement proper authentication
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.email) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { message, context, workspaceId, sessionId } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get existing wiki pages for context
    const wikiPages = await prisma.wikiPage.findMany({
      where: {
        workspaceId: workspaceId || 'workspace-1',
        isPublished: true
      },
      select: {
        title: true,
        content: true,
        excerpt: true,
        category: true,
        slug: true,
        tags: true
      },
      take: 10 // Limit for context
    })

    // Create context from existing wiki pages
    const wikiContext = wikiPages.map(page => 
      `Title: ${page.title}\nCategory: ${page.category}\nContent: ${page.excerpt || page.content.substring(0, 500)}...\n`
    ).join('\n')

    // Determine if this is a document creation request
    const isDocumentCreation = message.toLowerCase().includes('create') || 
                              message.toLowerCase().includes('draft') || 
                              message.toLowerCase().includes('write') ||
                              message.toLowerCase().includes('document')

    let systemPrompt = `You are Lumi AI, an intelligent documentation assistant for Lumi Work OS. You help users find information and create comprehensive wiki pages.

Available wiki pages for context:
${wikiContext}

Your capabilities:
1. Answer questions about existing wiki content
2. Create structured documents based on user requirements
3. Provide insights and suggestions

When creating documents, follow these guidelines:
- Use clear, professional language
- Structure content with proper headings
- Include relevant sections based on document type
- Ask clarifying questions when needed
- Suggest appropriate categories (general, engineering, sales, marketing, hr, product)

CRITICAL: When a user provides detailed information for document creation, you have two options:
1. If the user provides comprehensive information, CREATE THE FULL DOCUMENT with actual content using ALL their input
2. If information is missing, ask SPECIFIC follow-up questions to fill gaps

For document creation requests, respond with:
1. A comprehensive document plan
2. FULL DOCUMENT CONTENT using every detail provided by the user
3. Questions to clarify requirements (only if information is clearly insufficient)
4. Suggested category and visibility settings

IMPORTANT: When creating documents, use ALL the information provided by the user. Expand on every detail, include specific examples, technical specifications, features, benefits, and use cases mentioned. Make the document comprehensive and detailed.`

    if (isDocumentCreation) {
      systemPrompt += `

CRITICAL: You MUST respond with ONLY valid JSON for document creation requests. Do not include any text before or after the JSON.

Required JSON format:
{
  "content": "The FULL document content in clean markdown format (no HTML tags). Use ALL the user's input to create comprehensive content with detailed explanations, specific examples, technical details, and thorough coverage of every topic mentioned. Use markdown formatting: # for main headings, ## for subheadings, **bold** for emphasis, *italic* for emphasis, - for bullet points, 1. for numbered lists.",
  "documentPlan": {
    "title": "Suggested document title",
    "structure": ["Section 1", "Section 2", "Section 3"],
    "questions": ["Question 1", "Question 2"] // Only include if user input is insufficient
  }
}

CRITICAL RULES:
- If user provides detailed information, CREATE THE FULL DOCUMENT with actual content
- Use ALL the user's input to write comprehensive sections with real information
- Expand on every detail provided by the user with specific examples and explanations
- Include technical specifications, features, benefits, use cases, and implementation details
- Write detailed paragraphs, not just bullet points
- Provide comprehensive coverage of each topic mentioned
- Only ask questions if the user's input is clearly insufficient
- The "content" field should contain the actual document text, not just a plan
- Structure the content with proper headings and detailed information based on user input
- Make the document comprehensive and detailed, using every piece of information provided
- Include specific features, benefits, technical specifications, and use cases mentioned by the user
- Use clean markdown formatting: # for headings, **bold**, *italic*, - for lists, no HTML tags
- Structure content with proper markdown headings and formatting

REMEMBER: Your response must be ONLY the JSON object above - no additional text, explanations, or formatting outside the JSON.`
    }


    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const aiResponse = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response."

    // Try to parse JSON response for document creation
    let parsedResponse
    try {
      parsedResponse = JSON.parse(aiResponse)
    } catch (error) {
      parsedResponse = { content: aiResponse }
    }

    // Helper function to clean HTML and create clean excerpts
    const cleanHtml = (html: string) => {
      if (!html) return ''
      return html
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
        .replace(/&amp;/g, '&') // Replace &amp; with &
        .replace(/&lt;/g, '<') // Replace &lt; with <
        .replace(/&gt;/g, '>') // Replace &gt; with >
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim()
    }

    // Find relevant sources from wiki pages
    const sources = wikiPages
      .filter(page => 
        message.toLowerCase().includes(page.title.toLowerCase()) ||
        page.content.toLowerCase().includes(message.toLowerCase().split(' ')[0])
      )
      .slice(0, 3)
      .map(page => {
        const cleanExcerpt = cleanHtml(page.excerpt || page.content)
        return {
          title: page.title,
          url: `/wiki/${page.slug}`,
          excerpt: cleanExcerpt.substring(0, 150) + (cleanExcerpt.length > 150 ? '...' : '')
        }
      })

    // Save messages to database if sessionId is provided
    if (sessionId) {
      try {
        console.log('💾 Saving messages to database for session:', sessionId)
        
        // Save user message
        await prisma.chatMessage.create({
          data: {
            sessionId,
            type: 'USER',
            content: message
          }
        })

        // Save AI response
        await prisma.chatMessage.create({
          data: {
            sessionId,
            type: 'AI',
            content: parsedResponse.content || aiResponse,
            metadata: {
              sources,
              documentPlan: parsedResponse.documentPlan || null
            }
          }
        })

        // Update session timestamp
        await prisma.chatSession.update({
          where: { id: sessionId },
          data: { updatedAt: new Date() }
        })
        
        console.log('✅ Messages saved to database')
      } catch (dbError) {
        console.error('💥 Error saving messages to database:', dbError)
        // Continue with response even if DB save fails
      }
    }

    return NextResponse.json({
      content: parsedResponse.content || aiResponse,
      sources,
      documentPlan: parsedResponse.documentPlan || null
    })

  } catch (error) {
    console.error('Error in AI chat:', error)
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error.message 
    }, { status: 500 })
  }
}
