import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateAIResponse, AISource } from '@/lib/ai/providers'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

// Function to analyze AI response and identify relevant sources
async function identifyRelevantSources(aiResponse: string, availableSources: AISource[]): Promise<AISource[]> {
  try {
    const analysisPrompt = `Analyze this AI response and identify which sources from the available list were actually used or referenced. Only return sources that were genuinely utilized in the response.

AI Response: ${aiResponse}

Available Sources:
${availableSources.map((source, index) => `${index + 1}. ${source.title} (${source.type})`).join('\n')}

Return ONLY the numbers of sources that were actually used (e.g., "1,3,5" or "2,4"). If no sources were used, return "none".`

    const analysisResponse = await generateAIResponse(
      analysisPrompt,
      'gpt-4o-mini', // Use fast model for analysis
      {
        temperature: 0.1, // Very low temperature for consistent analysis
        maxTokens: 50
      }
    )

    const usedIndices = analysisResponse.content.trim()
    
    if (usedIndices === 'none' || !usedIndices) {
      return []
    }

    // Parse the indices and return corresponding sources
    const indices = usedIndices.split(',').map(i => parseInt(i.trim()) - 1).filter(i => i >= 0 && i < availableSources.length)
    return indices.map(i => availableSources[i]).filter(Boolean)
    
  } catch (error) {
    console.error('Error analyzing AI response for sources:', error)
    // Fallback: return empty array to be safe
    return []
  }
}

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
- "Lumi Product Overview"
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

// POST /api/ai/chat - Chat with AI assistant
export async function POST(request: NextRequest) {
  try {
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

        // Get comprehensive context from all Lumi data sources
        const workspaceId = chatSession.workspaceId

    // Generate cache key for AI context
    const contextCacheKey = cache.generateKey(
      CACHE_KEYS.AI_CONTEXT,
      workspaceId,
      'chat'
    )

    // Try cache first, then fetch fresh data
    const contextData = await cache.cacheWorkspaceData(
      contextCacheKey,
      workspaceId,
      async () => {
        // Use Promise.all for parallel queries
        const [wikiPages, projects, tasks, orgPositions] = await Promise.all([
          // 1. Wiki Pages (Knowledge Base) - Optimized
          prisma.wikiPage.findMany({
            where: {
              workspaceId,
              isPublished: true
            },
            select: {
              id: true,
              title: true,
              excerpt: true, // Use excerpt instead of full content
              slug: true,
              tags: true,
              category: true,
              updatedAt: true
            },
            take: 10, // Reduced from 15
            orderBy: { updatedAt: 'desc' }
          }),

          // 2. Projects & Tasks
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

    // 3. Tasks
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

    // 4. Organization Structure
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
})

    // Extract variables from cached data
    const { wikiPages, projects, tasks, orgPositions } = contextData

    // 4. Recent Activities
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

    // 5. Onboarding Plans
    const onboardingPlans = await prisma.onboardingPlan.findMany({
      where: { workspaceId },
      select: {
        title: true,
        status: true,
        startDate: true,
        endDate: true,
        users: {
          select: { name: true, email: true }
        }
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    })

    // 6. Workspace Members
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        role: true,
        user: {
          select: { name: true, email: true }
        }
      },
      take: 10
    })

    // Build comprehensive context including static documentation
    const wikiContext = wikiPages.map(page => 
      `📚 WIKI: ${page.title} (${page.category})\nContent: ${page.excerpt || page.content.substring(0, 300)}...\nTags: ${page.tags.join(', ')}\nViews: ${page.view_count}\n`
    ).join('\n')

    // Add static documentation context
    const staticDocsContext = `
📖 LUMI PRODUCT DOCUMENTATION:
# Lumi Work OS - Product Documentation

## Overview
Lumi Work OS is a comprehensive workplace operating system designed to streamline company operations through integrated knowledge management, project management, and workflow automation. Built as a calm, minimal platform, Lumi empowers teams to manage knowledge, onboard new members, and execute workflows efficiently.

## Product Vision
To create the most intuitive and powerful workplace operating system that brings together all essential business functions in one cohesive platform, enabling teams to focus on what matters most - building great products and delivering exceptional value.

## Core Features

### 1. Project Management
- **Kanban Board Interface**: Visual task management with drag-and-drop functionality
- **Task Status Tracking**: To Do, In Progress, In Review, Done, Blocked
- **Priority Management**: Low, Medium, High, Urgent priority levels
- **Team Collaboration**: Assign tasks, track progress, and manage deadlines
- **Project Documentation**: Integrated wiki pages for project-specific documentation

### 2. Knowledge Management (Wiki)
- **Hierarchical Documentation**: Organized wiki pages with categories and tags
- **Rich Text Editing**: Markdown support with live preview
- **Version Control**: Track changes and maintain document history
- **Search & Discovery**: Powerful search across all documentation
- **Permission Management**: Control access to sensitive information

### 3. AI-Powered Assistance
- **Intelligent Chat**: AI assistant for quick information retrieval
- **Document Generation**: Automated creation of policies, procedures, and documentation
- **Smart Suggestions**: Context-aware recommendations for tasks and content
- **Workflow Automation**: AI-driven process optimization

### 4. Team Onboarding
- **Structured Onboarding**: Step-by-step process for new team members
- **Resource Library**: Centralized access to training materials
- **Progress Tracking**: Monitor onboarding completion and effectiveness

### 5. Multi-tenant Workspaces
- **Secure Workspace Isolation**: Each organization has its own secure environment
- **Role-based Access Control**: Owner, Admin, Member roles with appropriate permissions
- **Team Management**: Invite and manage team members
- **Custom Branding**: Workspace-specific customization

### 6. Integrations
- **Slack Integration**: Real-time notifications and workflow triggers
- **Google Drive Sync**: Seamless document synchronization
- **Microsoft Teams**: Enterprise collaboration features
- **API Access**: RESTful APIs for custom integrations

## Technical Architecture
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript for type safety
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with OAuth support
- **AI Integration**: OpenAI GPT-4 and Anthropic Claude
- **Styling**: TailwindCSS with shadcn/ui components
- **State Management**: TanStack Query for server state

## Key Benefits
- **Centralized Knowledge**: All company information in one place
- **Improved Collaboration**: Streamlined team communication and task management
- **AI-Powered Efficiency**: Intelligent assistance for common tasks
- **Scalable Architecture**: Grows with your organization
- **Security First**: Enterprise-grade security and compliance
`

    const projectsContext = projects.map(project => 
      `🎯 PROJECT: ${project.name} (${project.status})\nDescription: ${project.description || 'No description'}\nPriority: ${project.priority}\nTeam: ${project.team || 'Unassigned'}\nDepartment: ${project.department || 'General'}\nTasks: ${project.tasks.length} tasks\n${project.tasks.map(task => `  - ${task.title} (${task.status}) - ${task.assignee?.name || 'Unassigned'}`).join('\n')}\n`
    ).join('\n')

    const orgContext = orgPositions.map(position => 
      `👤 ORG: ${position.title} (${position.department})\nLevel: ${position.level}\nUser: ${position.user?.name || 'Vacant'}\nReports to: ${position.parent?.title || 'Top Level'}\n`
    ).join('\n')

    const activitiesContext = recentActivities.map(activity => 
      `📈 ACTIVITY: ${activity.action} on ${activity.entity}\nTime: ${activity.createdAt.toISOString()}\n`
    ).join('\n')

    const onboardingContext = onboardingPlans.map(plan => 
      `🎓 ONBOARDING: ${plan.title} (${plan.status})\nUser: ${plan.users.name}\nPeriod: ${plan.startDate.toISOString()} - ${plan.endDate?.toISOString() || 'Ongoing'}\n`
    ).join('\n')

    const teamContext = workspaceMembers.map(member => 
      `👥 TEAM: ${member.user.name} (${member.role})\nEmail: ${member.user.email}\n`
    ).join('\n')

    // Build conversation history for AI
    const conversationHistory = chatMessages.map(msg => ({
      role: msg.type === 'USER' ? 'user' : 'assistant',
      content: msg.content
    }))

    // Create comprehensive system prompt
    const systemPrompt = `You are Lumi AI, an intelligent organizational assistant for Lumi Work OS. You have comprehensive access to all organizational data and can help with any aspect of the business.

## 📖 LUMI PRODUCT REFERENCE
${staticDocsContext}

## 🏢 ORGANIZATIONAL CONTEXT

### 📚 KNOWLEDGE BASE (Wiki Pages):
${wikiContext}

### 🎯 ACTIVE PROJECTS & TASKS:
${projectsContext}

### 👥 ORGANIZATION STRUCTURE:
${orgContext}

### 📈 RECENT ACTIVITIES:
${activitiesContext}

### 🎓 ONBOARDING STATUS:
${onboardingContext}

### 👥 TEAM MEMBERS:
${teamContext}

## 🚀 YOUR CAPABILITIES

### 📖 **Lumi Product Expertise**
- **Complete Product Knowledge**: You have access to the full Lumi Work OS product documentation
- **Feature Guidance**: Explain all Lumi features, capabilities, and benefits
- **Implementation Support**: Help users understand how to use Lumi effectively
- **Product Roadmap**: Discuss current features and planned enhancements
- **Technical Architecture**: Explain the underlying technology and integrations

### 📊 **Data Analysis & Insights**
- Analyze project progress and team performance
- Identify bottlenecks and optimization opportunities
- Provide data-driven recommendations
- Track team productivity and engagement

### 📚 **Knowledge Management**
- Answer questions about any wiki content
- Help create and structure documentation
- Suggest improvements to existing content
- Connect related information across different sources

### 🎯 **Project & Task Management**
- Provide project status updates and insights
- Help with task prioritization and assignment
- Suggest project templates and best practices
- Track dependencies and deadlines

### 👥 **Organizational Intelligence**
- Understand team structure and reporting relationships
- Help with onboarding and role transitions
- Provide insights on team dynamics and collaboration
- Suggest organizational improvements

### 🔄 **Workflow & Process Optimization**
- Analyze current workflows and suggest improvements
- Help design new processes and procedures
- Identify automation opportunities
- Track process compliance and effectiveness

## 💬 **CONVERSATION GUIDELINES**

### **Context Awareness**
- **Prioritize Lumi Product Knowledge**: Always reference the Lumi Work OS product documentation when answering questions about features, capabilities, or functionality
- Always reference specific data from the organizational context
- Use exact names, titles, and details from the data
- Connect information across different data sources
- Provide specific examples and evidence from the product documentation

### **Response Quality**
- Be conversational, engaging, and professional
- Use clear formatting with bullet points, numbered lists, and proper spacing
- Break up long responses into readable sections
- Always be helpful and solution-oriented
- Ask clarifying questions when needed
- Provide specific examples and recommendations

### **Data Integration**
- When discussing projects, reference specific tasks and team members
- When talking about people, mention their roles and departments
- When suggesting improvements, reference existing wiki content
- Always provide actionable next steps

### **Professional Tone**
- Use appropriate business language
- Be respectful of organizational hierarchy
- Maintain confidentiality and professionalism
- Focus on constructive, helpful responses

Remember: You have access to the full conversation history, so maintain context throughout the conversation and build upon previous exchanges naturally.`

    // Generate AI response first
    const aiResponse = await generateAIResponse(
      message,
      model,
      {
        systemPrompt,
        conversationHistory,
        temperature: 0.7,
        maxTokens: 2000
      }
    )

    // Build all available sources for analysis
    const allAvailableSources: AISource[] = [
      // Wiki sources
      ...wikiPages.map(page => ({
        type: 'wiki' as const,
        id: page.id,
          title: page.title,
          url: `/wiki/${page.slug}`,
        excerpt: page.excerpt || page.content.substring(0, 100) + '...'
      })),
      // Project sources
      ...projects.map(project => ({
        type: 'project' as const,
        id: project.id,
        title: project.name,
        url: `/projects/${project.id}`,
        excerpt: project.description || 'Project details'
      })),
      // Organization sources
      ...orgPositions.map(position => ({
        type: 'org' as const,
        id: position.id || `org-${position.title}`,
        title: `${position.title} (${position.department})`,
        url: `/org`,
        excerpt: `Organization position: ${position.title}`
      })),
      // Documentation source
      {
        type: 'documentation' as const,
        id: 'lumi-product-docs',
        title: 'Lumi Product Documentation',
        url: '/wiki/product-reference',
        excerpt: 'Complete Lumi Work OS product documentation'
      }
    ]

    // Analyze AI response to identify which sources were actually used
    console.log('🔍 Analyzing AI response for relevant sources...')
    const relevantSources = await identifyRelevantSources(aiResponse.content, allAvailableSources)
    console.log('📚 Relevant sources identified:', relevantSources.length, 'out of', allAvailableSources.length)
        
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
            content: aiResponse.content,
            metadata: {
              model: aiResponse.model,
              usage: aiResponse.usage,
              sources: relevantSources
            } as any
          }
        })

        // Update session timestamp and generate title if it's still "New Chat"
        if (chatSession.title === 'New Chat') {
          console.log('🎯 Generating smart title for new chat...')
          const smartTitle = await generateChatTitle(message, aiResponse.content)
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
        
    console.log('✅ AI response generated successfully')
    console.log('  - Model used:', aiResponse.model)
    console.log('  - Response length:', aiResponse.content.length)
    if (aiResponse.usage) {
      console.log('  - Tokens used:', aiResponse.usage.totalTokens)
    }

    return NextResponse.json({
      content: aiResponse.content,
      model: aiResponse.model,
      usage: aiResponse.usage,
      sources: relevantSources
    })

  } catch (error) {
    console.error('Error in AI chat:', error)
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}