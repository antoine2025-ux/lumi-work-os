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

    const { message, context, workspaceId, sessionId, isSystemMessage, wikiPageData } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    console.log('📨 Received request:')
    console.log('  - Message:', message)
    console.log('  - Session ID:', sessionId)
    console.log('  - Workspace ID:', workspaceId)
    console.log('  - Context:', context)
    console.log('  - Is System Message:', isSystemMessage)
    console.log('  - Wiki Page Data:', wikiPageData)

    // Handle system messages (like wiki page creation success)
    if (isSystemMessage && wikiPageData && sessionId) {
      try {
        // Save the system message with wiki page data
        await prisma.chatMessage.create({
          data: {
            sessionId,
            type: 'AI',
            content: `Perfect! I've created your wiki page "${wikiPageData.title}". You can view and edit it using the link below.`,
            metadata: {
              wikiPage: wikiPageData
            }
          }
        })

        // Update session timestamp
        await prisma.chatSession.update({
          where: { id: sessionId },
          data: { updatedAt: new Date() }
        })

        console.log('✅ System message with wiki page data saved successfully')
        
        return NextResponse.json({
          content: `Perfect! I've created your wiki page "${wikiPageData.title}". You can view and edit it using the link below.`,
          wikiPage: wikiPageData
        })
      } catch (error) {
        console.error('💥 Error saving system message:', error)
        return NextResponse.json({ error: 'Failed to save system message' }, { status: 500 })
      }
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
        slug: true,
        tags: true
      },
      take: 10 // Limit for context
    })

    // Get chat session and messages for conversation context
    let chatSession = null
    let chatMessages: any[] = []
    
    if (sessionId) {
      try {
        chatSession = await prisma.chatSession.findUnique({
          where: { id: sessionId }
        })
        
        if (chatSession) {
          chatMessages = await prisma.chatMessage.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' }
          })
        }
      } catch (error) {
        console.error('Error fetching chat session:', error)
        // Continue without conversation context
      }
    }

    // Create context from existing wiki pages
    const wikiContext = wikiPages.map(page => 
      `Title: ${page.title}\nContent: ${page.excerpt || page.content.substring(0, 500)}...\n`
    ).join('\n')

    // Check if this is a new conversation (first message or no session)
    const isNewConversation = !sessionId || chatMessages.length === 0
    
    // Check if this is a response to the initial greeting or if conversation is already in progress
    const isResponseToGreeting = chatMessages.length === 1 && 
      chatMessages[0]?.content?.includes('Hello! I\'m Lumi AI, your intelligent documentation assistant')
    
    // Check if conversation is already in progress (has more than 1 message)
    const isConversationInProgress = chatMessages.length > 1

    // Determine conversation mode based on user input
    const isWikiCreationMode = message.toLowerCase().includes('creating a wiki') || 
                              message.toLowerCase().includes('create wiki') ||
                              message.toLowerCase().includes('wiki creation') ||
                              message.toLowerCase().includes('📝 creating a wiki')
    
    const isGeneralKnowledgeMode = message.toLowerCase().includes('general info') || 
                                  message.toLowerCase().includes('general knowledge') ||
                                  message.toLowerCase().includes('general guidance') ||
                                  message.toLowerCase().includes('💡 general info')

    // Determine if this is a document creation request
    const isDocumentCreation = message.toLowerCase().includes('create') || 
                              message.toLowerCase().includes('draft') || 
                              message.toLowerCase().includes('write') ||
                              message.toLowerCase().includes('document') ||
                              message.toLowerCase().includes('policy') ||
                              message.toLowerCase().includes('procedure') ||
                              message.toLowerCase().includes('guide') ||
                              message.toLowerCase().includes('template') ||
                              message.toLowerCase().includes('manual') ||
                              message.toLowerCase().includes('handbook') ||
                              message.toLowerCase().includes('standard') ||
                              message.toLowerCase().includes('protocol')

    console.log('🔍 Conversation analysis:')
    console.log('  - Message:', message)
    console.log('  - Is new conversation:', isNewConversation)
    console.log('  - Is response to greeting:', isResponseToGreeting)
    console.log('  - Is wiki creation mode:', isWikiCreationMode)
    console.log('  - Is general knowledge mode:', isGeneralKnowledgeMode)
    console.log('  - Is document creation:', isDocumentCreation)

    // Handle specific option selections
    if (isWikiCreationMode) {
      // Create session if it doesn't exist
      let newSessionId = sessionId
      if (!sessionId) {
        try {
          const newSession = await prisma.chatSession.create({
            data: {
              title: 'New Chat',
              workspaceId: workspaceId || 'workspace-1',
              userId: 'user-1' // TODO: Get from session
            }
          })
          newSessionId = newSession.id
        } catch (error) {
          console.error('Error creating chat session:', error)
        }
      }

      const wikiContent = `Perfect! I'd be happy to help you create a comprehensive wiki page. 

To get started, could you tell me:

1. **What type of document** do you want to create? (e.g., policy, procedure, guide, manual, handbook, etc.)
2. **What should the document be about?** Please give me a brief description of the topic or subject.
3. **Who is the intended audience?** (e.g., all employees, specific departments, new hires, etc.)

Once I have these details, I'll ask some follow-up questions to gather all the necessary information and then create a complete wiki page for you!`

      // Save the wiki response to the database
      if (newSessionId) {
        try {
          await prisma.chatMessage.create({
            data: {
              sessionId: newSessionId,
              type: 'AI',
              content: wikiContent
            }
          })
        } catch (error) {
          console.error('Error saving wiki response message:', error)
        }
      }

      const wikiResponse = {
        content: wikiContent,
        sources: [],
        documentPlan: null,
        sessionId: newSessionId
      }
      
      return NextResponse.json(wikiResponse)
    }

    if (isGeneralKnowledgeMode) {
      // Create session if it doesn't exist
      let newSessionId = sessionId
      if (!sessionId) {
        try {
          const newSession = await prisma.chatSession.create({
            data: {
              title: 'New Chat',
              workspaceId: workspaceId || 'workspace-1',
              userId: 'user-1' // TODO: Get from session
            }
          })
          newSessionId = newSession.id
        } catch (error) {
          console.error('Error creating chat session:', error)
        }
      }

      const generalContent = `Great! I'm here to help you find information and provide guidance.

What do you need help with? I can:

• **Search existing wiki content** for specific information
• **Answer questions** about your company's policies, procedures, or documentation
• **Provide guidance** on various topics
• **Help you navigate** your knowledge base

Just let me know what you're looking for, and I'll do my best to help!`

      // Save the general response to the database
      if (newSessionId) {
        try {
          await prisma.chatMessage.create({
            data: {
              sessionId: newSessionId,
              type: 'AI',
              content: generalContent
            }
          })
        } catch (error) {
          console.error('Error saving general response message:', error)
        }
      }

      const generalResponse = {
        content: generalContent,
        sources: [],
        documentPlan: null,
        sessionId: newSessionId
      }
      
      return NextResponse.json(generalResponse)
    }

    // Handle new conversation greeting (for any first message, but not responses to greeting or ongoing conversations)
    if (isNewConversation && !isResponseToGreeting && !isConversationInProgress) {
      // Create a new chat session if one doesn't exist
      let newSessionId = sessionId
      if (!sessionId) {
        try {
          const newSession = await prisma.chatSession.create({
            data: {
              title: 'New Chat',
              workspaceId: workspaceId || 'workspace-1',
              userId: 'user-1' // TODO: Get from session
            }
          })
          newSessionId = newSession.id
        } catch (error) {
          console.error('Error creating chat session:', error)
        }
      }

      const greetingContent = `Hello! I'm Lumi AI, your intelligent documentation assistant. What can I help you with today?

Please choose from the following options:

**📝 Creating a Wiki** - I'll help you create comprehensive wiki pages, documents, policies, or procedures. I'll ask relevant questions to gather all necessary information and then generate a complete wiki page for you.

**💡 General Info** - I'll help you find information from existing wiki content and provide general guidance on various topics.

Simply type your choice or describe what you need help with!`

      // Save the greeting message to the database
      if (newSessionId) {
        try {
          await prisma.chatMessage.create({
            data: {
              sessionId: newSessionId,
              type: 'AI',
              content: greetingContent
            }
          })
        } catch (error) {
          console.error('Error saving greeting message:', error)
        }
      }

      const greetingResponse = {
        content: greetingContent,
        sources: [],
        documentPlan: null,
        sessionId: newSessionId
      }
      
      return NextResponse.json(greetingResponse)
    }

    let systemPrompt = `You are Lumi AI, an intelligent documentation assistant for Lumi Work OS. You help users find information and create comprehensive wiki pages.

Available wiki pages for context:
${wikiContext}

Your capabilities:
1. Answer questions about existing wiki content
2. Create structured documents based on user requirements
3. Provide insights and suggestions

CONVERSATION CONTEXT AWARENESS:
- You have access to the full conversation history
- Pay attention to ALL details the user has provided in previous messages
- If a user answers your questions with specific details, use that information immediately
- Don't ask for information the user has already provided

MODE-SPECIFIC BEHAVIOR:

**WIKI CREATION MODE** (when user selects "Creating a Wiki" or similar):
1. Ask what type of document they want to create (policy, procedure, guide, etc.)
2. Ask specific, relevant questions to gather comprehensive information
3. Once you have enough details, present the document structure in this EXACT JSON format:
\`\`\`json
{
  "title": "Document Title",
  "content": {
    "Section Name": {
      "text": "Section content here",
      "order": 1
    }
  }
}
\`\`\`
4. When user confirms (says "looks good", "yes", "create", "generate", etc.), ask for wiki creation parameters (section, visibility, tags)
5. When user provides parameters, create the actual wiki page

**GENERAL KNOWLEDGE MODE** (when user selects "General Info" or similar):
1. Use the available wiki context to answer questions
2. Provide insights and suggestions based on existing content
3. Help users find relevant information
4. Offer to create new content if needed

**DOCUMENT CREATION** (when users directly request creation):
1. FIRST: Analyze their request AND the entire conversation history
2. IF the user has provided sufficient details in ANY previous message, proceed directly to create the document
3. IF you need more information, ask specific clarifying questions
4. ONCE you have enough information, provide a comprehensive plan and ask for confirmation

Use clear, professional language and suggest appropriate categories (general, engineering, sales, marketing, hr, product).`

    // Special handling for explicit document creation confirmations
    if (message.toLowerCase().includes('yes, create') || 
        message.toLowerCase().includes('yes, generate') || 
        message.toLowerCase().includes('yes, draft') ||
        message.toLowerCase().includes('create the wiki') ||
        message.toLowerCase().includes('generate the wiki') ||
        message.toLowerCase().includes('draft the document')) {
      
      systemPrompt += `

🚨 CRITICAL: User has confirmed document creation. You MUST respond with ONLY valid JSON. No text before or after the JSON.

CONVERSATION CONTEXT TO USE:
${chatMessages.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')}

Based on this conversation, create a comprehensive wiki page. Use ALL the information provided by the user to create detailed, specific content.

Required JSON format:
{
  "content": "The FULL document content in clean markdown format. Use ALL the user's input to create comprehensive content with detailed explanations, specific examples, technical details, and thorough coverage of every topic mentioned. Use markdown formatting: # for main headings, ## for subheadings, **bold** for emphasis, *italic* for emphasis, - for bullet points, 1. for numbered lists.",
  "documentPlan": {
    "title": "Suggested document title based on user's request",
    "structure": ["Section 1", "Section 2", "Section 3"],
    "questions": [] // Only include if user input is insufficient
  }
}

CRITICAL RULES FOR DOCUMENT CREATION:
✅ ALWAYS create the FULL document with actual content
✅ Use ALL the user's input to write comprehensive sections
✅ Expand on every detail with specific examples and explanations
✅ Include technical specifications, features, benefits, use cases
✅ Write detailed paragraphs, not just bullet points
✅ Provide comprehensive coverage of each topic mentioned
✅ The "content" field should contain the actual document text
✅ Structure with proper headings and detailed information
✅ Use clean markdown formatting: # for headings, **bold**, *italic*, - for lists
✅ Make the document comprehensive and detailed

🚨 REMEMBER: Your response must be ONLY the JSON object above - no additional text, explanations, or formatting outside the JSON.`
    }


    // Build conversation history for context
    const messages: Array<{role: "system" | "user" | "assistant", content: string}> = [
      {
        role: "system" as const,
        content: systemPrompt
      }
    ]

    // Add conversation history if available
    if (chatSession && chatMessages.length > 0) {
      console.log('📚 Found conversation history:', chatMessages.length, 'messages')
      // Add recent conversation history (last 10 messages to avoid token limits)
      const recentMessages = chatMessages.slice(-10)
      recentMessages.forEach((msg: any) => {
        messages.push({
          role: msg.type === 'USER' ? "user" : "assistant",
          content: msg.content
        })
      })
      console.log('📝 Added', recentMessages.length, 'messages to context')
    } else {
      console.log('⚠️ No conversation history available')
    }

    // Add current message
    messages.push({
      role: "user" as const,
      content: message
    })

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000
    })

    const aiResponse = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response."

    // Check if this is a confirmed document creation request
    const isConfirmedDocumentCreation = message.toLowerCase().includes('yes, create') || 
                                       message.toLowerCase().includes('yes, generate') || 
                                       message.toLowerCase().includes('yes, draft') ||
                                       message.toLowerCase().includes('create the wiki') ||
                                       message.toLowerCase().includes('generate the wiki') ||
                                       message.toLowerCase().includes('draft the document') ||
                                       message.toLowerCase().includes('looks good') ||
                                       message.toLowerCase().includes('looks great') ||
                                       message.toLowerCase().includes('perfect') ||
                                       message.toLowerCase().includes('yes') ||
                                       message.toLowerCase().includes('create') ||
                                       message.toLowerCase().includes('generate') ||
                                       message.toLowerCase().includes('proceed')

    // Check if this is a wiki creation parameters request (section, visibility, etc.)
    const isWikiCreationParams = message.toLowerCase().includes('section:') ||
                                message.toLowerCase().includes('visibility:') ||
                                message.toLowerCase().includes('category:') ||
                                message.toLowerCase().includes('tags:') ||
                                message.toLowerCase().includes('public') ||
                                message.toLowerCase().includes('private') ||
                                message.toLowerCase().includes('policies') ||
                                message.toLowerCase().includes('procedures') ||
                                message.toLowerCase().includes('guides')

    console.log('🤖 Raw AI response:', aiResponse)
    console.log('📏 Response length:', aiResponse.length)
    console.log('🔍 Is document creation request:', isDocumentCreation)
    console.log('🔍 Is confirmed document creation:', isConfirmedDocumentCreation)
    console.log('🔍 Is wiki creation params:', isWikiCreationParams)
    console.log('🔍 Message contains section:', message.toLowerCase().includes('section:'))
    console.log('🔍 Message contains visibility:', message.toLowerCase().includes('visibility:'))
    console.log('🔍 Message contains tags:', message.toLowerCase().includes('tags:'))

    // Try to parse JSON response only for confirmed document creation
    let parsedResponse
    try {
      // Clean the response to extract JSON if it's wrapped in other text
      let cleanResponse = aiResponse.trim()
      
      // If it's a confirmed document creation request, try to extract JSON from the response
      if (isConfirmedDocumentCreation) {
        console.log('🔍 Looking for JSON in response:', cleanResponse.substring(0, 200) + '...')
        // Look for JSON object in the response (including code blocks)
        const jsonMatch = cleanResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/) || cleanResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          cleanResponse = jsonMatch[1] || jsonMatch[0]
          console.log('✅ Found JSON match:', cleanResponse.substring(0, 100) + '...')
        } else {
          console.log('❌ No JSON match found')
        }
      }
      
      parsedResponse = JSON.parse(cleanResponse)
      console.log('✅ Successfully parsed JSON response:', parsedResponse)
    } catch (error) {
      console.log('❌ Failed to parse JSON, treating as text:', error instanceof Error ? error.message : 'Unknown error')
      console.log('📝 Raw response that failed to parse:', aiResponse)
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

    // Handle wiki creation flow
    let wikiPage = null
    let finalContent = aiResponse
    
    // Check if we have JSON structure in conversation history
    let jsonFromHistory = null
    if ((isConfirmedDocumentCreation && !parsedResponse.title) || isWikiCreationParams) {
      console.log('🔍 Looking for JSON in conversation history, messages count:', chatMessages.length)
      // Look for JSON in the conversation history
      for (let i = chatMessages.length - 1; i >= 0; i--) {
        const msg = chatMessages[i]
        console.log(`📝 Checking message ${i}:`, msg.type, msg.content.substring(0, 100) + '...')
        if (msg.type === 'AI' && msg.content.includes('```json')) {
          console.log('🎯 Found message with JSON code block')
          const jsonMatch = msg.content.match(/```json\s*(\{[\s\S]*?\})\s*```/)
          if (jsonMatch) {
            console.log('📋 JSON match found:', jsonMatch[1].substring(0, 100) + '...')
            try {
              jsonFromHistory = JSON.parse(jsonMatch[1])
              console.log('✅ Found JSON in conversation history:', jsonFromHistory.title)
              break
            } catch (error) {
              console.log('❌ Failed to parse JSON from history:', error)
            }
          } else {
            console.log('❌ No JSON match in message')
          }
        }
      }
    }
    
    if (isConfirmedDocumentCreation && (parsedResponse.title || jsonFromHistory?.title) && (parsedResponse.content || parsedResponse.structure || jsonFromHistory?.content)) {
      // User confirmed the document structure, ask for creation parameters
      const docTitle = parsedResponse.title || jsonFromHistory?.title
      finalContent = `Perfect! I have the structure for your "${docTitle}" document. 

Before I create the wiki page, I need a few more details:

**1. Which section should this fall under?**
- Policies & Procedures
- Company Guidelines  
- Technical Documentation
- Training Materials
- Other (please specify)

**2. What should be the visibility level?**
- Public (visible to all employees)
- Private (restricted access)
- Department-specific (specify which department)

**3. Any specific tags or categories?** (optional)
- e.g., "IT", "Security", "HR", "Compliance"

Please provide these details in the format:
\`\`\`
Section: [your choice]
Visibility: [your choice]  
Tags: [optional tags]
\`\`\`

Once you provide these details, I'll create the wiki page for you!`
    } else if (isConfirmedDocumentCreation && !parsedResponse.title) {
      // User confirmed but we don't have the JSON structure yet, ask them to provide more details
      finalContent = `I'd be happy to help you create a wiki page! However, I need a bit more information first.

Could you please tell me:

1. **What type of document** do you want to create? (e.g., policy, procedure, guide, manual, handbook, etc.)
2. **What should the document be about?** Please give me a brief description of the topic or subject.
3. **Who is the intended audience?** (e.g., all employees, specific departments, new hires, etc.)

Once I have these details, I'll ask some follow-up questions to gather all the necessary information and then create a complete wiki page for you!`
    } else if (isWikiCreationParams && jsonFromHistory?.title && jsonFromHistory?.content) {
      // User provided creation parameters, create the wiki page
      try {
        // Use JSON from history
        const docData = jsonFromHistory
        
        // Extract parameters from the message
        const sectionMatch = message.match(/section:\s*([^\n]+)/i)
        const visibilityMatch = message.match(/visibility:\s*([^\n]+)/i)
        const tagsMatch = message.match(/tags:\s*([^\n]+)/i)
        
        const section = sectionMatch ? sectionMatch[1].trim() : 'Policies & Procedures'
        const visibility = visibilityMatch ? visibilityMatch[1].trim() : 'Public'
        const tags = tagsMatch ? tagsMatch[1].trim().split(',').map((t: string) => t.trim()) : []
        
        // Create slug from title
        const slug = docData.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .trim()
        
        // Build the wiki content from the structured data
        let wikiContent = `# ${docData.title}\n\n`
        
        if (docData.content && typeof docData.content === 'object') {
          // Sort by order if available
          const sortedSections = Object.entries(docData.content)
            .sort(([,a], [,b]) => ((a as any).order || 0) - ((b as any).order || 0))
          
          for (const [sectionTitle, sectionData] of sortedSections) {
            wikiContent += `## ${sectionTitle}\n\n${(sectionData as any).text}\n\n`
          }
        } else if (docData.structure && Array.isArray(docData.structure)) {
          // Handle the structure array format
          for (const section of docData.structure) {
            if (typeof section === 'string') {
              wikiContent += `## ${section}\n\n[Content to be added]\n\n`
            } else if (section.sectionTitle && section.content) {
              wikiContent += `## ${section.sectionTitle}\n\n${section.content}\n\n`
            }
          }
        }
        
        // Create the wiki page
        const newWikiPage = await prisma.wikiPage.create({
          data: {
            title: docData.title,
            content: wikiContent,
            slug: slug,
            workspaceId: workspaceId || 'workspace-1',
            createdById: 'user-1', // TODO: Get from session
            category: section.toLowerCase(),
            permissionLevel: visibility.toLowerCase(),
            tags: tags,
            excerpt: (docData.content as any)?.Introduction?.text || (docData.content as any)?.introduction?.text || 'No excerpt available'
          }
        })
        
        wikiPage = {
          id: newWikiPage.id,
          title: newWikiPage.title,
          slug: newWikiPage.slug,
          url: `/wiki/${newWikiPage.slug}`
        }
        
        finalContent = `🎉 **Wiki page created successfully!**

**Title:** ${docData.title}
**Section:** ${section}
**Visibility:** ${visibility}
**Tags:** ${tags.join(', ') || 'None'}
**URL:** /wiki/${slug}

Your wiki page is now live and accessible to your team. You can view it by clicking the link above or navigating to the Wiki section in your dashboard.

Is there anything else you'd like me to help you with?`
        
        console.log('✅ Wiki page created:', newWikiPage.id)
      } catch (error) {
        console.error('❌ Error creating wiki page:', error)
        finalContent = `I encountered an error while creating your wiki page. Please try again or contact support if the issue persists.

Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
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
        console.log('📝 User message:', message)
        console.log('🤖 AI response:', parsedResponse.content || aiResponse)
        console.log('📋 Document plan:', parsedResponse.documentPlan)
        
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

        // Update session timestamp and generate title if it's still "New Chat"
        const session = await prisma.chatSession.findUnique({
          where: { id: sessionId }
        })
        
        if (session && session.title === 'New Chat') {
          // Generate a title from the first message (truncate to 50 chars)
          const title = message.length > 50 ? message.substring(0, 50) + '...' : message
          await prisma.chatSession.update({
            where: { id: sessionId },
            data: { 
              updatedAt: new Date(),
              title: title
            }
          })
        } else {
          await prisma.chatSession.update({
            where: { id: sessionId },
            data: { updatedAt: new Date() }
          })
        }
        
        console.log('✅ Messages saved to database successfully')
      } catch (dbError) {
        console.error('💥 Error saving messages to database:', dbError)
        // Continue with response even if DB save fails
      }
    } else {
      console.log('⚠️ No sessionId provided, skipping message saving')
    }

    const response = {
      content: finalContent,
      sources,
      documentPlan: parsedResponse.documentPlan || null,
      wikiPage: wikiPage,
      sessionId: sessionId
    }
    
    console.log('📤 Final API response:')
    console.log('  - Content length:', response.content.length)
    console.log('  - Sources count:', response.sources.length)
    console.log('  - Document plan:', !!response.documentPlan)
    if (response.documentPlan) {
      console.log('  - Document plan details:', response.documentPlan)
    }
    
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in AI chat:', error)
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
