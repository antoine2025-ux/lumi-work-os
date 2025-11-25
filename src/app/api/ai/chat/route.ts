import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateAIResponse, AISource } from '@/lib/ai/providers'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'
import { getUnifiedAuth } from '@/lib/unified-auth'

// Type definitions for LoopwellAI structured response
export interface LoopwellAIResponse {
  intent: 'answer' | 'summarize' | 'improve_existing_page' | 'append_to_page' | 'create_new_page' | 'extract_tasks' | 'find_things' | 'tag_pages' | 'do_nothing'
  confidence: number
  rationale: string
  citations: Array<{ title: string; id: string }>
  preview: {
    title?: string
    markdown?: string
    diff?: string
    tasks?: Array<{
      title: string
      description: string
      assignee_suggestion?: string
      due_suggestion?: string
      labels: string[]
    }>
    tags?: string[]
  }
  next_steps: Array<'ask_clarifying_question' | 'insert' | 'replace_section' | 'create_page' | 'create_tasks'>
}

// Function to parse JSON from AI response (handles triple backticks and potential formatting)
function parseStructuredResponse(responseText: string): LoopwellAIResponse | null {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1])
    }

    // Try parsing the entire response as JSON
    const jsonStart = responseText.indexOf('{')
    const jsonEnd = responseText.lastIndexOf('}') + 1
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const jsonStr = responseText.substring(jsonStart, jsonEnd)
      return JSON.parse(jsonStr)
    }

    // Fallback: return null if parsing fails
    return null
  } catch (error) {
    console.error('Error parsing structured response:', error)
    return null
  }
}

// Function to generate smart chat titles
async function generateChatTitle(userMessage: string, aiResponse: LoopwellAIResponse): Promise<string> {
  try {
    // Use intent and preview title if available
    if (aiResponse.preview?.title) {
      return aiResponse.preview.title.substring(0, 50)
    }

    // Generate based on intent
    const intentLabels: Record<string, string> = {
      answer: 'Chat',
      summarize: 'Summary',
      improve_existing_page: 'Page Improvement',
      append_to_page: 'Page Update',
      create_new_page: 'New Page',
      extract_tasks: 'Tasks',
      find_things: 'Search Results',
      tag_pages: 'Tag Suggestions',
      do_nothing: 'Chat'
    }

    const words = userMessage.split(' ').slice(0, 4).join(' ')
    return `${intentLabels[aiResponse.intent] || 'Chat'}: ${words.substring(0, 30)}`
  } catch (error) {
    console.error('Error generating chat title:', error)
    const words = userMessage.split(' ').slice(0, 4)
    return words.join(' ').replace(/[^\w\s]/g, '') || 'New Chat'
  }
}

// POST /api/ai/chat - Chat with LoopwellAI assistant
export async function POST(request: NextRequest) {
  try {
    console.log('📥 POST /api/ai/chat - Starting request processing')
    
    // Authenticate user
    let auth
    try {
      auth = await getUnifiedAuth(request)
      console.log('✅ Authentication successful, workspaceId:', auth.workspaceId)
    } catch (authError) {
      console.error('❌ Authentication failed:', authError)
      return NextResponse.json({ 
        error: 'Authentication failed',
        details: authError instanceof Error ? authError.message : 'Unknown auth error'
      }, { status: 401 })
    }
    
    // Parse request body
    let requestBody
    try {
      requestBody = await request.json()
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return NextResponse.json({ 
        error: 'Invalid request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      }, { status: 400 })
    }
    
    const { message, sessionId, model = 'gpt-4-turbo', context } = requestBody

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    console.log('📨 Received chat request:')
    console.log('  - Message:', message)
    console.log('  - Session ID:', sessionId)
    console.log('  - Model:', model)
    console.log('  - Context:', context)

    // Get chat session
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId }
    })

    if (!chatSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Validate workspaceId exists
    const workspaceId = chatSession.workspaceId
    if (!workspaceId) {
      console.error('❌ Chat session missing workspaceId:', chatSession.id)
      return NextResponse.json({ error: 'Chat session missing workspace ID' }, { status: 400 })
    }

    // Get conversation history
    const chatMessages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 20 // Limit to last 20 messages for context
    })

    // Generate cache key for AI context
    const contextCacheKey = cache.generateKey(
      CACHE_KEYS.AI_CONTEXT,
      workspaceId,
      'chat'
    )

    // Get comprehensive context from workspace
    const contextData = await cache.cacheWorkspaceData(
      contextCacheKey,
      workspaceId,
      async () => {
        const [wikiPages, projects, tasks, orgPositions] = await Promise.all([
          // Wiki Pages
          prisma.wikiPage.findMany({
            where: {
              workspaceId,
              isPublished: true
            },
            select: {
              id: true,
              title: true,
              excerpt: true,
              slug: true,
              tags: true,
              category: true,
              updatedAt: true
            },
            take: 15,
            orderBy: { updatedAt: 'desc' }
          }),

          // Projects
          prisma.project.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        priority: true,
        startDate: true,
        endDate: true,
        department: true,
        team: true,
        createdAt: true,
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: { name: true, email: true }
            }
          },
          take: 5
        }
      },
      take: 10,
      orderBy: { updatedAt: 'desc' }
    }),

          // Tasks
    prisma.task.findMany({
      where: { workspaceId },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assignee: {
          select: { name: true, email: true }
        }
      },
      take: 20,
      orderBy: { createdAt: 'desc' }
    }),

          // Organization Structure
    prisma.orgPosition.findMany({
      where: { 
        workspaceId,
        isActive: true 
      },
      select: {
        id: true,
        title: true,
        teamId: true,
        team: {
          select: {
            name: true,
            department: {
              select: { name: true }
            }
          }
        },
        level: true,
        user: {
          select: { name: true, email: true }
        },
        parent: {
          select: { 
            title: true,
            team: {
              select: {
                name: true,
                department: {
                  select: { name: true }
                }
              }
            }
          }
        }
      },
      take: 20
    })
  ])

  return { wikiPages, projects, tasks, orgPositions }
      }
    )

    const { wikiPages, projects, tasks, orgPositions } = contextData

    // Get active page info if context provided
    const activePage = context?.pageId 
      ? await prisma.wikiPage.findUnique({
          where: { id: context.pageId },
          select: {
            id: true,
            title: true,
            content: true,
            slug: true,
            excerpt: true
          }
        })
      : null
    
    // Determine mode: Page Context Mode (has pageId OR is editing a draft) vs Global Mode
    // If user is editing a draft page (has content/title), treat as Page Context Mode
    const hasPageContext = !!context?.pageId || !!(context?.content || (context?.title && context.title !== 'New page'))
    const isPageContextMode = hasPageContext && (!!activePage || !!(context?.content || context?.title))
    const isGlobalMode = !isPageContextMode

    // Get workspace info
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        description: true
      }
    })

    // Recent activities
    const recentActivities = await prisma.activity.findMany({
      where: { actorId: chatSession.userId },
      select: {
        entity: true,
        action: true,
        meta: true,
        createdAt: true
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    })

    // Build context strings for LoopwellAI
    const activeSpace = workspace ? {
      name: workspace.name,
      purpose: workspace.description || 'Team workspace'
    } : context?.workspaceName ? {
      name: context.workspaceName,
      purpose: context.workspacePurpose || 'Team workspace'
    } : null

    const activePageInfo = activePage ? {
      title: activePage.title,
      is_empty: !activePage.content || activePage.content.trim().length === 0,
      selected_text: context?.selectedText || null,
      breadcrumbs: activePage.slug ? activePage.slug.split('/') : []
    } : context?.title ? {
      title: context.title,
      is_empty: !context.content || context.content.trim().length === 0,
      selected_text: context?.selectedText || null,
      breadcrumbs: []
    } : null

    const relatedDocs = wikiPages.slice(0, 10).map(page => ({
      title: page.title,
      snippet: page.excerpt || 'No excerpt available'
    }))

    const projectsEpicsTasks = {
      projects: projects.slice(0, 5).map(p => ({
        name: p.name,
        status: p.status,
        description: p.description || ''
      })),
      tasks: tasks.slice(0, 10).map(t => ({
        title: t.title,
        status: t.status,
        priority: t.priority
      }))
    }

    const orgInfo = {
      teams: orgPositions.map(p => ({
        name: p.team?.name || p.team?.department?.name || 'General',
        role: p.title
      })),
      members: orgPositions.filter(p => p.user).map(p => ({
        name: p.user?.name || '',
        role: p.title,
        department: p.team?.department?.name || p.team?.name || ''
      }))
    }

    const recentActivity = recentActivities.map(a => ({
      entity: a.entity,
      action: a.action,
      time: a.createdAt.toISOString()
    }))

    // Build conversation history
    const conversationHistory = chatMessages.map(msg => ({
      role: msg.type === 'USER' ? 'user' : 'assistant',
      content: msg.content
    }))

    // Build LoopwellAI system prompt - Different prompts for Page Context vs Global Mode
    let systemPrompt: string
    
    if (isPageContextMode) {
      // PAGE CONTEXT MODE - User is inside a specific page
      systemPrompt = `You are Loopwell's Contextual Spaces AI. The user is currently viewing or editing a specific page in the Spaces wiki.

YOUR MAIN JOB: Help them write or refine the content of THIS page.

BEHAVIOR RULES:
1. Assume the current page is the target unless the user clearly asks to create a separate page.
2. Do NOT ask for a page title or location when you already know you are inside a page.
3. Ask clarifying questions only if you need essential information to draft a useful document (for example, specific requirements for a policy).
4. If the user's request is clear enough, start drafting immediately.
5. If user explicitly says "create a new page" or "under [Space]", then treat it as a new page request.

OUTPUT RULES:
1. Always output valid Markdown for the page content.
2. Use "#", "##", "###" for headings, with blank lines between blocks.
3. Use bullet points and numbered lists where helpful.
4. Do NOT wrap the content in code fences.
5. The content you return will be inserted directly into the current page.
6. Return ONLY the document content - no meta commentary unless user asks for explanation.

EXAMPLES:
- "Create a policy for AI usage on this page" → Draft a complete AI usage policy directly into the current page.
- "Draft a good use policy for this page" → Draft the policy content on this page, no questions about title or location.
- "Create a new page for this under the Product Space" → Ask where to create it, then confirm that a new page (not the current one) is desired.

CURRENT PAGE CONTEXT:
${activePage ? `Page Title: "${activePage.title}"
Current Content: ${activePage.content ? activePage.content.substring(0, 500) + '...' : '(empty page)'}` : 'No active page'}
`
    } else {
      // GLOBAL MODE - User is NOT editing a specific page (Home or global view)
      systemPrompt = `You are Loopwell's Contextual Spaces AI. The user is NOT currently editing a specific page.

YOUR MAIN JOB: Help them create new pages in the correct location.

BEHAVIOR RULES:
1. When the user asks for a document, treat this as a request to create a new page.
2. Ask where the page should live (Space or project) if this is not already clear.
3. Infer a reasonable title from the user's request when possible, and suggest it.
4. If you cannot infer a title, ask for one in a single, simple question.
5. Once you have title and location, draft the full document immediately.

OUTPUT RULES:
1. Always output valid Markdown for the page content.
2. Do NOT include meta-text in the response, only the document body.
3. The system will create the new page and insert your Markdown as its content.

EXAMPLE:
User: "Create an AI usage policy for the whole company."
You:
- Ask: "Which Space or project should this page be created under?"
- Suggest a title like "AI Usage Policy".
- Then draft the full policy document in Markdown.
`
    }
    
    // Add common context and formatting rules
    systemPrompt += `
CONTEXT YOU RECEIVE
${activeSpace ? `active_space: ${JSON.stringify(activeSpace)}` : 'active_space: none'}
${activePageInfo ? `active_page: ${JSON.stringify(activePageInfo)}` : 'active_page: none'}
related_docs: ${JSON.stringify(relatedDocs.slice(0, 10))}
projects/epics/tasks: ${JSON.stringify(projectsEpicsTasks)}
org info: ${JSON.stringify(orgInfo)}
recent_activity: ${JSON.stringify(recentActivity.slice(0, 5))}

INTENTS YOU CAN CHOOSE (exactly one primary per reply)
• answer — conversational response (no write).
• summarize — executive digest of selected/related content (preview).
• improve_existing_page — rewrite/refactor current section or selection (preview).
• append_to_page — add a new section to the current page (preview).
• create_new_page — draft a new page when clearly requested (preview).
• extract_tasks — convert content into actionable tasks (preview list).
• find_things — semantic search/locate docs with citations (no write).
• tag_pages — propose tags/categories (preview).
• do_nothing — if no useful action is possible; ask 1 clarifying question.

INTENTS YOU CAN CHOOSE (exactly one primary per reply)
• answer — conversational response (no write).
• summarize — executive digest of selected/related content (preview).
• improve_existing_page — rewrite/refactor current section or selection (preview).
• append_to_page — add a new section to the current page (preview).
• create_new_page — draft a new page when clearly requested (preview).
• extract_tasks — convert content into actionable tasks (preview list).
• find_things — semantic search/locate docs with citations (no write).
• tag_pages — propose tags/categories (preview).
• do_nothing — if no useful action is possible; ask 1 clarifying question.

ROUTING POLICY - AUTOMATIC INTENT DETECTION
${isPageContextMode ? `
PAGE CONTEXT MODE - Default to current page:
• If user mentions "create", "draft", "write", "make", "generate" WITHOUT "new page" → append_to_page or improve_existing_page (draft into current page).
• If user mentions "create NEW page", "new page under [X]", "separate page" → create_new_page (ask for location).
• If user mentions "rewrite", "refactor", "clean up", "fix tone", "improve", "edit" → improve_existing_page.
• If user mentions "add", "append", "insert section", "document decision" → append_to_page.
• If user mentions "summarize", "tl;dr", "brief me" or highlights text → summarize.
• If user mentions "turn into tasks", "extract action items", "todo" → extract_tasks.
• If user asks "what/why/how/compare/explain" → answer.
• If user mentions "find", "show", "list docs", "where is", "cite sources" → find_things.
• If user mentions "tag", "categorize", "organize" → tag_pages.
` : `
GLOBAL MODE - Default to new page:
• If user mentions "create", "draft", "write", "make", "generate", "spec", "PRD", "meeting notes" → create_new_page (ask for location and title).
• If user mentions "summarize", "tl;dr", "brief me" → summarize.
• If user mentions "turn into tasks", "extract action items", "todo" → extract_tasks.
• If user asks "what/why/how/compare/explain" → answer.
• If user mentions "find", "show", "list docs", "where is", "cite sources" → find_things.
• If user mentions "tag", "categorize", "organize" → tag_pages.
`}
• If truly ambiguous → ask ONE clear question, then proceed.

DOCUMENT GENERATION RULES
• Generate fully formatted Markdown pages ready for immediate insertion.
• Follow proper Markdown conventions: # for title, ## for section headers, spacing between paragraphs, lists, etc.
• Never return plain text or collapsed formatting.
• Return only the document content unless the user asked for an explanation.
• Keep documents < ~2,000 words. Use clear Markdown (H2/H3, bullets, tables when helpful).
• Use the Space's vocabulary; keep tone concise and professional.
• Cite sources when quoting/paraphrasing Space content: [Title] or {title, id}.
• If context is thin, make reasonable assumptions and proceed—don't ask unless absolutely critical.

PAGE OPERATIONS
• If the page already exists, include in your response: "Page '[title]' already exists. Should I overwrite it, rename it, or append to the existing content?" Then proceed with generation.
• If user asks to create a page under a specific Space or Project, use that path automatically.
• If information is missing and required, ask one clear question (no multi-step interrogation).
• Extract title from message automatically (e.g., "create Product Roadmap" → title: "Product Roadmap").
• Extract location from message automatically (e.g., "under Loopwell project" → workspace: "Loopwell project").

OUTPUT FORMAT (JSON inside triple backticks)
Return exactly this structure every time:
{
  "intent": "<one of: answer | summarize | improve_existing_page | append_to_page | create_new_page | extract_tasks | find_things | tag_pages | do_nothing>",
  "confidence": 0.0-1.0,
  "rationale": "One-sentence reason for routing choice.",
  "citations": [{ "title": "Doc Title", "id": "doc-id" }] | [],
  "preview": {
    "title": "Suggested title if creating/retitling",
    "markdown": "Proposed Markdown content (or summary).",
    "diff": "If improving: short bullet list of key changes or a unified-diff-like explanation.",
    "tasks": [
      { "title": "", "description": "", "assignee_suggestion": "", "due_suggestion": "", "labels": [] }
    ],
    "tags": ["tag-1", "tag-2"]
  },
  "next_steps": ["ask_clarifying_question" | "insert" | "replace_section" | "create_page" | "create_tasks"]
}

• If intent is answer or find_things, you may leave preview.markdown empty and place the conversational answer in preview.markdown for consistency.
• If intent is write-like (improve/append/create/extract/tag), always populate preview so the user can confirm.

MARKDOWN FORMATTING RULES (CRITICAL - MUST FOLLOW)
Your job is to generate clean, structured wiki documents directly inside a page editor.
Always output GitHub-flavored Markdown. The formatting rules below MUST be followed:

1. Start with a clear H1 title using a single "#".
2. Use "##" and "###" headings to organize sections.
3. Insert a blank line between every heading, paragraph, or list.
4. Keep paragraphs short (2–4 lines each).
5. Use bullet lists ("- ") for unordered items.
6. Use numbered lists ("1.") for ordered steps.
7. Use bold text for emphasis when needed.
8. Never wrap the final output in code blocks or quotes.
9. Output only raw Markdown content.

Tone and structure:
- Write clearly and professionally.
- Follow a logical document structure.
- Use headings to separate ideas.
- Avoid overly long blocks of text.

The document should be ready for immediate rendering in the Loopwell wiki editor without additional cleanup.

STYLE GUIDE FOR CONTENT DRAFTS
• Start with a 2–4 line Executive Summary.
• Then sections like: Goals, Scope, Decisions, Risks, Open Questions, Next Steps.
• Use action verbs and bullets. Avoid fluff.
• For specs/PRDs: include Acceptance Criteria and Success Metrics.
• For meeting notes: include Decisions, Action Items (owner, due).
• For improvements: preserve meaning, remove redundancy, enhance scannability.

VOICE & UX - NOTION-STYLE ASSISTANT
• Be proactive, intuitive, and act like a Notion-style assistant.
• Keep conversation smooth and avoid unnecessary friction.
• Assume the user wants the task completed unless explicitly unclear.
• Your final output should ALWAYS be a single Markdown document ready to be placed directly into the editor, unless the user is clarifying details.
• If page exists, mention it in rationale but still generate the content - frontend will handle the conflict resolution.

TASK EXTRACTION RULES
• Only create tasks that are specific, doable, and valuable in the current Space.
• Each task: clear title, 1–2 line description, suggested owner role (not a person unless explicitly provided), optional due date, 2–4 labels.
• Group tasks by theme if >10 items.

SELF-CHECKLIST (run before replying)
• Did I pick the least invasive intent that still satisfies the user?
• If I'm drafting: is a preview provided and under length?
• Are citations included when referencing Space content?
• If context is missing, did I ask one targeted question instead of guessing?
• Is the output immediately useful and clean?`

    // Generate AI response with structured JSON output
    const prompt = `${message}

Remember to return your response as JSON in triple backticks with the exact structure specified in the system prompt.`

    console.log('🤖 Generating LoopwellAI response...')
    console.log('   Model:', model)
    console.log('   Has API key:', !!process.env.OPENAI_API_KEY)
    console.log('   Conversation history length:', conversationHistory.length)
    console.log('   System prompt length:', systemPrompt.length)
    
    let aiResponse
    try {
      aiResponse = await generateAIResponse(
        prompt,
        model,
        {
          systemPrompt,
          conversationHistory,
          temperature: 0.7,
          maxTokens: 3000 // Increased for structured JSON
        }
      )
      console.log('✅ AI response received, length:', aiResponse.content?.length || 0)
    } catch (aiError) {
      console.error('❌ Error generating AI response:', aiError)
      console.error('   Error type:', aiError instanceof Error ? aiError.constructor.name : typeof aiError)
      console.error('   Error message:', aiError instanceof Error ? aiError.message : String(aiError))
      throw new Error(`AI generation failed: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`)
    }

    // Parse structured response
    console.log('🔍 Parsing structured response...')
    let structuredResponse: LoopwellAIResponse | null = parseStructuredResponse(aiResponse.content)

    // Fallback if parsing fails - create a simple answer response
    if (!structuredResponse) {
      console.warn('⚠️ Failed to parse structured response, creating fallback...')
      structuredResponse = {
        intent: 'answer',
        confidence: 0.5,
        rationale: 'Failed to parse structured response, defaulting to answer intent',
        citations: [],
        preview: {
          markdown: aiResponse.content
        },
        next_steps: []
      }
    }

    // Build available sources for citations
    const availableSources = [
      ...wikiPages.map(page => ({
          title: page.title,
        id: page.id
      })),
      ...projects.map(project => ({
        title: project.name,
        id: project.id
      }))
    ]

    // Match citations with actual sources
    const matchedCitations = structuredResponse.citations.map(citation => {
      const source = availableSources.find(s => 
        s.title.toLowerCase().includes(citation.title.toLowerCase()) ||
        s.id === citation.id
      )
      return source || citation
    })

    structuredResponse.citations = matchedCitations

    console.log('✅ LoopwellAI response generated:')
    console.log('  - Intent:', structuredResponse.intent)
    console.log('  - Confidence:', structuredResponse.confidence)
    console.log('  - Citations:', structuredResponse.citations.length)
        
        // Save user message
        await prisma.chatMessage.create({
          data: {
            sessionId,
            type: 'USER',
            content: message
          }
        })

    // Save AI response (store full response text and structured data)
        await prisma.chatMessage.create({
          data: {
            sessionId,
            type: 'AI',
        content: structuredResponse.preview?.markdown || aiResponse.content,
            metadata: {
              model: aiResponse.model,
              usage: aiResponse.usage,
          structuredResponse,
          rawResponse: aiResponse.content
            } as any
          }
        })

    // Update session timestamp and generate title if needed
        if (chatSession.title === 'New Chat') {
          console.log('🎯 Generating smart title for new chat...')
      const smartTitle = await generateChatTitle(message, structuredResponse)
          console.log('📝 Generated title:', smartTitle)
          
          await prisma.chatSession.update({
            where: { id: sessionId },
            data: { 
              updatedAt: new Date(),
              title: smartTitle
            }
          })
        } else {
          await prisma.chatSession.update({
            where: { id: sessionId },
            data: { updatedAt: new Date() }
          })
        }
        
    // Return structured response
    return NextResponse.json({
      ...structuredResponse,
      model: aiResponse.model,
      usage: aiResponse.usage
    })

  } catch (error) {
    console.error('❌ Error in LoopwellAI chat:', error)
    console.error('   Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('   Error message:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      console.error('   Stack trace:', error.stack)
    }
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}