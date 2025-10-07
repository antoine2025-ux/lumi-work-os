import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import OpenAI from 'openai'
import { searchWikiKnowledge, formatWikiKnowledgeForAI } from '@/lib/wiki-knowledge'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Mock response function for testing when OpenAI is not available
function getMockResponse(session: any, message: string, messageCount: number): string {
  if (session.intent === 'doc_gen') {
    switch (session.phase) {
      case 'idle':
        // Extract document type from message
        const docType = message.toLowerCase().includes('handbook') ? 'handbook' :
                       message.toLowerCase().includes('policy') ? 'policy' :
                       message.toLowerCase().includes('procedure') ? 'procedure' :
                       message.toLowerCase().includes('guide') ? 'guide' : 'document'
        
        return `Great! I'd love to help you create a ${docType}. To get started, I need to gather some information from you.\n\nCould you tell me:\n1. What's the main purpose of this ${docType}?\n2. Who is the target audience (employees, managers, etc.)?\n3. What topics should be covered?\n4. What's the tone you're looking for (formal, casual, etc.)?\n5. Are there any specific policies or procedures that must be included?\n6. What's the expected length or scope?`
      case 'intake':
        if (messageCount <= 2) {
          return "Thanks for that information! Let me ask a few more questions to make sure I understand your needs:\n\n- What industry is your company in?\n- How many employees will be using this handbook?\n- Do you have any existing policies or documents I should reference?\n- Are there any legal or compliance requirements I should be aware of?"
        } else {
          return "Perfect! I have enough information to generate your handbook. I'll create a comprehensive document that covers all the topics we discussed. Click 'Generate Draft' in the sidebar when you're ready!"
        }
      case 'gathering_requirements':
        return "I have enough information to generate your document. Click 'Generate Draft' in the sidebar when you're ready!"
      case 'ready_to_draft':
        return "I have enough information to generate your document. Click 'Generate Draft' in the sidebar when you're ready!"
      case 'draft_ready':
        return "Your draft is ready! You can view it in the sidebar. If it looks good, just say 'publish' and I'll automatically publish it to the wiki!"
      case 'published':
        return "Your document has been successfully published! You can view it in the sidebar. Is there anything else you'd like help with?"
      default:
        return "I'm here to help you create your document. What would you like to know?"
    }
  } else {
    return "Hello! I'm here to help. You can ask me anything or say 'I want to create a document' to start the document generation process."
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message, phase } = await request.json()

    if (!sessionId || !message) {
      return NextResponse.json({ error: 'Session ID and message required' }, { status: 400 })
    }

    // Get the session
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId: sessionId,
        type: 'USER',
        content: message,
        metadata: {}
      }
    })

    // Build conversation context
    const conversationHistory = session.messages.map(msg => ({
      role: msg.type === 'USER' ? 'user' : 'assistant',
      content: msg.content
    }))

    // Search for relevant wiki knowledge first (with timeout)
    let wikiResults = []
    try {
      // Try multiple search strategies
      const searchStrategies = [
        message.toLowerCase().replace(/[^\w\s]/g, ' ').trim(), // Original message cleaned
        message.toLowerCase().split(/\s+/).filter(w => w.length > 2).slice(0, 2).join(' '), // First 2 meaningful words
        message.toLowerCase().split(/\s+/).filter(w => w.length > 3).join(' '), // All words longer than 3 chars
        'product', 'policy', 'device', 'security' // Common terms
      ].filter(Boolean)
      
      console.log('🔍 Trying search strategies:', searchStrategies)
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Wiki search timeout')), 5000)
      )
      
      for (const searchTerm of searchStrategies) {
        if (wikiResults.length > 0) break // Stop if we found results
        
        console.log('🔍 Searching wiki for:', searchTerm)
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001'
        
        try {
          const wikiResponse = await Promise.race([
            fetch(`${baseUrl}/api/wiki/search?q=${encodeURIComponent(searchTerm)}&workspaceId=${session.workspaceId}`),
            timeoutPromise
          ]) as Response
        
          if (wikiResponse.ok) {
            const wikiData = await wikiResponse.json()
            if (wikiData.results && wikiData.results.length > 0) {
              wikiResults = wikiData.results
              console.log('📚 Wiki search found:', wikiResults.length, 'results for:', searchTerm)
              break
            }
          }
        } catch (searchError) {
          console.log('⚠️ Wiki search failed for:', searchTerm, searchError.message)
          continue // Try next search term
        }
      }
      
      if (wikiResults.length === 0) {
        console.log('📚 No wiki results found for any search strategy')
      }
    } catch (error) {
      console.error('Error retrieving wiki knowledge:', error)
    }

    // Add current user message
    conversationHistory.push({
      role: 'user',
      content: message
    })

    // Add wiki context as a system message if available
    if (wikiResults.length > 0) {
      let wikiContext = 'RELEVANT WIKI CONTENT:\n\n'
      wikiResults.slice(0, 3).forEach((result, index) => {
        wikiContext += `${index + 1}. **${result.title}** (${result.category})\n`
        wikiContext += `   - Content: ${result.excerpt || result.content.substring(0, 300)}...\n`
        wikiContext += `   - URL: /wiki/${result.slug}\n\n`
      })
      wikiContext += 'Use this specific wiki content to answer questions. Always cite the page title and URL when referencing this information.'
      
      conversationHistory.push({
        role: 'system',
        content: wikiContext
      })
    }

    // Create system prompt based on phase and intent
    let systemPrompt = `You are Lumi AI, an intelligent assistant for document creation and general assistance.

IMPORTANT FORMATTING RULES:
- Use clear, conversational language with proper spacing
- Break up long responses into readable paragraphs
- Use bullet points and numbered lists when appropriate
- Add line breaks between sections for better readability
- Be helpful and engaging, not robotic

CRITICAL INSTRUCTIONS:
- You have access to the organization's wiki knowledge base
- If you see "RELEVANT WIKI CONTENT" in the conversation, you MUST use that specific information
- Always cite the exact page titles and URLs provided in the wiki context
- Do not ask for URLs or context - use what is provided in the conversation
- Base your response on the specific wiki content, not generic information`

    if (session.intent === 'doc_gen') {
      systemPrompt += `\n\nYou are helping the user create a document. The current phase is: ${session.phase || 'idle'}

IMPORTANT: You are part of an automated document generation system. Follow these exact phase guidelines:

Phase Guide:
- idle: Welcome the user and ask what type of document they want to create. Be enthusiastic and helpful.
- intake: Ask 4-6 specific questions about the document (title, purpose, audience, scope, structure, tone, constraints). Ask them one at a time or all together.
- gathering_requirements: Continue gathering requirements until you have enough information. Ask follow-up questions if needed.
- ready_to_draft: When you have sufficient information, say "I have enough information to generate your document. Click 'Generate Draft' in the sidebar when you're ready!"
- drafting: This phase is handled by the system - you don't need to respond here.
- draft_ready: Present the draft and ask for feedback. Say "Your draft is ready! You can view it in the sidebar. If it looks good, just say 'publish' and I'll automatically publish it to the wiki!"
- editing: Help them refine the document if they want changes.
- publishing: This phase is handled automatically by the system.
- published: The document has been successfully published! Provide the wiki link and ask if they need help with anything else.

CRITICAL: 
- When the user says "publish", "looks good", "perfect", or "ready to publish" during draft_ready phase, the system will automatically publish the document to the wiki and provide a direct link.
- If the session is already in 'published' phase, acknowledge the successful publication and provide the wiki link.
- Do NOT ask users to click buttons that don't exist for their current phase.

Be conversational, helpful, and guide them through the document creation process step by step.`

      // Add session context if document is published
      if (session.phase === 'published' && session.wikiUrl) {
        systemPrompt += `\n\nCURRENT SESSION STATUS: The document has been successfully published! Wiki URL: ${session.wikiUrl}`
      }
    } else {
      systemPrompt += `\n\nYou are providing general assistance. Be helpful, informative, and conversational.`
    }

    // Get AI response from OpenAI with fallback to mock responses
    let aiResponse = "I'm sorry, I couldn't process your request."
    
    try {
      console.log('🤖 Sending to OpenAI:')
      console.log('🔑 OpenAI API Key exists:', !!process.env.OPENAI_API_KEY)
      console.log('🔑 API Key length:', process.env.OPENAI_API_KEY?.length || 0)
      console.log('📝 System prompt length:', systemPrompt.length)
      console.log('📝 Wiki results count:', wikiResults.length)
      console.log('📝 System prompt preview:', systemPrompt.substring(0, 500) + '...')
      console.log('💬 Conversation history length:', conversationHistory.length)
      
      // Create timeout promise for OpenAI call
      const openaiTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI API timeout')), 15000)
      )
      
      const completion = await Promise.race([
        openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
        openaiTimeout
      ]) as any

      aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your request."
      console.log('✅ AI response received, length:', aiResponse.length)
    } catch (error: any) {
      console.error('❌ OpenAI API error:', error.message || error)
      console.error('❌ Error details:', error.response?.data || error)
      console.log('⚠️ Falling back to mock response due to API error')
      // Fall back to mock responses when API fails
      aiResponse = getMockResponse(session, message, conversationHistory.length)
    }

    // Save AI message
    const aiMessage = await prisma.chatMessage.create({
      data: {
        sessionId: sessionId,
        type: 'AI',
        content: aiResponse,
        metadata: {}
      }
    })

    // Determine next phase based on conversation
    let nextPhase = session.phase
    let shouldAutoPublish = false

    if (session.intent === 'doc_gen') {
      if (session.phase === 'idle' && (message.toLowerCase().includes('document') || message.toLowerCase().includes('handbook') || message.toLowerCase().includes('policy'))) {
        nextPhase = 'intake'
      } else if (session.phase === 'intake' && conversationHistory.length >= 4) {
        nextPhase = 'gathering_requirements'
      } else if (session.phase === 'gathering_requirements' && conversationHistory.length >= 6) {
        nextPhase = 'ready_to_draft'
      } else if (session.phase === 'ready_to_draft' && message.toLowerCase().includes('yes')) {
        nextPhase = 'drafting'
      } else if (session.phase === 'draft_ready' && (
        message.toLowerCase().includes('publish') || 
        message.toLowerCase().includes('ready to publish') ||
        message.toLowerCase().includes('looks good') ||
        message.toLowerCase().includes('perfect') ||
        message.toLowerCase().includes('please publish')
      )) {
        shouldAutoPublish = true
        nextPhase = 'publishing'
      }
    }


    // Update session phase if changed
    if (nextPhase !== session.phase) {
      console.log(`Phase transition: ${session.phase} -> ${nextPhase}`)
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { phase: nextPhase }
      })
    }

    return NextResponse.json({
      message: aiResponse,
      phase: nextPhase,
      sessionId: sessionId,
      shouldAutoPublish: shouldAutoPublish
    })

  } catch (error) {
    console.error('Error processing assistant message:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json({ 
      error: 'Failed to process message', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
