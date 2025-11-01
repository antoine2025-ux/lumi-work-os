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
    const auth = await getUnifiedAuth(request)
    
    const { message, sessionId, model = 'gpt-4-turbo', context } = await request.json()

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

    // Get conversation history
    const chatMessages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 20 // Limit to last 20 messages for context
    })

        const workspaceId = chatSession.workspaceId

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
        department: true,
        level: true,
        user: {
          select: { name: true, email: true }
        },
        parent: {
          select: { title: true, department: true }
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
        name: p.department || 'General',
        role: p.title
      })),
      members: orgPositions.filter(p => p.user).map(p => ({
        name: p.user?.name || '',
        role: p.title,
        department: p.department || ''
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

    // Build LoopwellAI system prompt
    const systemPrompt = `You are Loopwell's Contextual Spaces AI. You help teams work inside a Workspace (aka Space) that contains wiki pages, projects, epics, tasks, and org context. Your job is to infer intent, decide the best action, and produce a preview—never write to the wiki unless the user explicitly confirms.

PRIMARY GOALS
1. Answer accurately using the active Space's context.
2. Choose the right action (chat vs. draft vs. improve vs. extract tasks).
3. Return a concise, insertion-ready preview when drafting is appropriate.
4. Cite sources when referencing Space content.
5. Be conservative with writes: default to chat unless the user clearly asks to create/modify content.

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

ROUTING POLICY
• If the user asks what/why/how/compare/explain → answer.
• If they say summarize/tl;dr/brief me or highlight text → summarize.
• If they say rewrite/refactor/clean up/fix tone or provide a selection → improve_existing_page.
• If they say add/append a section or "document decision/action items" on a non-empty page → append_to_page.
• If they say create/draft/write/spec/PRD/meeting notes and a new artifact is implied (or page is empty) → create_new_page.
• If they say turn this into tasks/extract action items/todo → extract_tasks.
• If they say find/show/list docs about X / where is Y / cite sources → find_things.
• If they say tag/categorize/organize → tag_pages.
• If ambiguous → answer with 1 crisp clarifying question, no write.

SAFETY & QUALITY RULES
• Never write directly. Always produce a preview for user confirmation.
• Keep previews < ~2,000 words. Use clear Markdown (H2/H3, bullets, tables when helpful).
• Use the Space's vocabulary; keep tone concise and professional.
• Cite sources when quoting/paraphrasing Space content: [Title] or {title, id}.
• If context is thin, state uncertainty and request the missing piece.
• Prefer incremental edits (append/improve) over full rewrites unless asked.

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

STYLE GUIDE FOR CONTENT DRAFTS
• Start with a 2–4 line Executive Summary.
• Then sections like: Goals, Scope, Decisions, Risks, Open Questions, Next Steps.
• Use action verbs and bullets. Avoid fluff.
• For specs/PRDs: include Acceptance Criteria and Success Metrics.
• For meeting notes: include Decisions, Action Items (owner, due).
• For improvements: preserve meaning, remove redundancy, enhance scannability.

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
    const aiResponse = await generateAIResponse(
      prompt,
      model,
      {
        systemPrompt,
        conversationHistory,
        temperature: 0.7,
        maxTokens: 3000 // Increased for structured JSON
      }
    )

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
    console.error('Error in LoopwellAI chat:', error)
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}