"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, FileText, Search, Plus, X, History, Clock, Trash2, ExternalLink, CheckCircle, Loader2, ChevronDown } from "lucide-react"
import MarkdownViewer from "@/components/assistant/markdown-viewer"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { TemplateSelector } from "@/components/projects/template-selector"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Session {
  id: string
  intent: string
  phase: string
  requirementNotes?: any
  draftTitle?: string
  draftBody?: string
  wikiUrl?: string
  projectUrl?: string
}

interface DraftSettings {
  category: string
  visibility: string
  tags: string[]
  reviewRequired: boolean
}

interface ChatHistoryItem {
  id: string
  title: string
  intent: string
  phase: string
  draftTitle?: string
  wikiUrl?: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

export default function AskPage() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showDraft, setShowDraft] = useState(false)
  const [showPublishSheet, setShowPublishSheet] = useState(false)
  const [showHistory, setShowHistory] = useState(true)
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [draftSettings, setDraftSettings] = useState<DraftSettings>({
    category: 'general',
    visibility: 'public',
    tags: [],
    reviewRequired: false
  })
  const [selectedQuickActions, setSelectedQuickActions] = useState<string[]>([])
  const [showWelcome, setShowWelcome] = useState(true)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory()
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const messagesContainer = document.getElementById('messages-container')
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: 'smooth'
        })
      }, 150)
    }
  }, [messages])

  // Handle scroll events to show/hide scroll-to-bottom button
  useEffect(() => {
    const messagesContainer = document.getElementById('messages-container')
    if (!messagesContainer) return

    const handleScroll = () => {
      const isNearBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 100
      setShowScrollToBottom(!isNearBottom && messages.length > 0)
    }

    messagesContainer.addEventListener('scroll', handleScroll)
    return () => messagesContainer.removeEventListener('scroll', handleScroll)
  }, [messages.length])

  const scrollToBottom = () => {
    const messagesContainer = document.getElementById('messages-container')
    if (messagesContainer) {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

  const loadChatHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const response = await fetch('/api/assistant/history?limit=20')
      const data = await response.json()
      setChatHistory(data.sessions || [])
    } catch (error) {
      console.error('Error loading chat history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const loadSession = async (sessionId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/assistant?sessionId=${sessionId}`)
      const data = await response.json()
      
      if (data.id) {
        setSession({
          id: data.id,
          intent: data.intent,
          phase: data.phase,
          requirementNotes: data.requirementNotes,
          draftTitle: data.draftTitle,
          draftBody: data.draftBody,
          wikiUrl: data.wikiUrl
        })
        
        // Load messages for this session
        const messagesResponse = await fetch(`/api/ai/chat-sessions/${sessionId}`)
        const messagesData = await messagesResponse.json()
        
        if (messagesData.messages) {
          const formattedMessages = messagesData.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.type === 'USER' ? 'user' : 'assistant',
            content: msg.content,
            timestamp: new Date(msg.createdAt)
          }))
          setMessages(formattedMessages)
        }
        
        setShowWelcome(false)
      }
    } catch (error) {
      console.error('Error loading session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteSession = async (sessionId: string) => {
    try {
      await fetch(`/api/ai/chat-sessions/${sessionId}`, {
        method: 'DELETE'
      })
      setChatHistory(prev => prev.filter(item => item.id !== sessionId))
      
      // If this was the current session, clear it
      if (session?.id === sessionId) {
        setSession(null)
        setMessages([])
        setShowWelcome(true)
      }
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  const startNewChat = () => {
    setSession(null)
    setMessages([])
    setShowDraft(false)
    setShowPublishSheet(false)
    setShowWelcome(true)
  }

  const startSession = async (intent: 'doc_gen' | 'assist' | 'project_creation') => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, workspaceId: 'cmgl0f0wa00038otlodbw5jhn' })
      })

      const data = await response.json()
      console.log('Session created:', data)
      
      setSession({
        id: data.sessionId,
        intent: data.intent,
        phase: data.phase,
        requirementNotes: undefined,
        draftTitle: undefined,
        draftBody: undefined,
        wikiUrl: undefined,
        projectUrl: undefined
      })

      setShowWelcome(false)
      
      // Send initial message for all intents
      const initialMessage = intent === 'doc_gen' 
        ? "I want to create a document. Please help me get started."
        : intent === 'project_creation'
        ? "I want to create a project. Please help me get started."
        : "I need help with general questions about our wiki and knowledge base."
      
      await sendMessage(initialMessage, data.sessionId)
      loadChatHistory()
    } catch (error) {
      console.error('Error starting session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async (message: string, sessionId?: string) => {
    const currentSessionId = sessionId || session?.id
    if (!message.trim() || !currentSessionId) {
      console.error('No message or session ID:', { message, sessionId, currentSessionId })
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      console.log('Sending message:', { message, sessionId: currentSessionId, phase: session?.phase })
      
      const response = await fetch('/api/assistant/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message,
          phase: session?.phase
        })
      })

      const data = await response.json()
      console.log('Message response:', data)
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'I received your message but had trouble processing it. Please try again.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])
      
      // Update session phase
      if (data.phase && data.phase !== session?.phase) {
        setSession(prev => prev ? { ...prev, phase: data.phase } : null)
      }

      // Also update session ID if provided
      if (data.sessionId && data.sessionId !== session?.id) {
        setSession(prev => prev ? { ...prev, id: data.sessionId } : null)
      }

      // Check if we should show the generate draft button
      if (data.phase === 'ready_to_draft' && session?.intent === 'doc_gen') {
        const draftButtonMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: "I have enough information to generate your document. Click 'Generate Draft' in the sidebar when you're ready!",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, draftButtonMessage])
      }

      // Check if we should show the create project button
      if (data.phase === 'ready_to_create' && session?.intent === 'project_creation') {
        const projectButtonMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: "I have enough information to create your project. Click 'Create Project' in the sidebar when you're ready!",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, projectButtonMessage])
      }

      // Check if we should auto-create project
      if (data.shouldAutoCreateProject && session?.intent === 'project_creation') {
        try {
          // Extract project data from conversation
          const projectData = extractProjectData(messages)

          const createResponse = await fetch('/api/assistant/create-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              sessionId: session.id,
              projectData
            })
          })

          const createData = await createResponse.json()
          
          if (createData.success && createData.projectUrl) {
            setSession(prev => prev ? {
              ...prev,
              projectUrl: createData.projectUrl,
              phase: 'project_created'
            } : null)
            
            // Add success message with direct link
            const successMessage: Message = {
              id: (Date.now() + 2).toString(),
              role: 'assistant',
              content: `🎉 **Project Created Successfully!**\n\nYour project "${createData.project.name}" has been created.\n\n[📋 View Project](${createData.projectUrl})`,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, successMessage])
          }
        } catch (error) {
          console.error('Error creating project:', error)
        }
      }

    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      if (session) {
        sendMessage(input, session.id)
      } else {
        // If no session, start a general assistance session
        startSession('assist')
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const generateDraft = async () => {
    if (!session) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/assistant/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id })
      })

      const data = await response.json()
      
      if (data.title && data.content) {
        setSession(prev => prev ? {
          ...prev,
          draftTitle: data.title,
          draftBody: data.content,
          phase: data.phase
        } : null)
        
        setShowDraft(true)
        
        // Add a message about the draft being ready
        const draftMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `I've generated a draft of your document: "${data.title}". You can review it in the sidebar and make any edits before publishing.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, draftMessage])
      }
    } catch (error) {
      console.error('Error generating draft:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const extractProjectData = (messages: Message[]) => {
    const conversationText = messages
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(' ')

    console.log('Extracting project data from conversation:', conversationText)

    // More comprehensive project name extraction
    const namePatterns = [
      // Direct statements
      /(?:project is called|project name is|name is|called)\s+["']?([^"',.\n]+?)["']?(?:\s|$|,|\.)/i,
      /(?:create|build|develop|start)\s+(?:a\s+)?(?:project\s+)?(?:called\s+)?["']?([^"',.\n]+?)["']?(?:\s+(?:for|to|that|which)|$|,|\.)/i,
      /(?:the\s+)?(?:project\s+)?["']?([^"',.\n]+?)["']?(?:\s+(?:project|feature|system|app|tool|platform))/i,
      // More flexible patterns
      /(?:project\s+)?["']?([^"',.\n]+?)["']?(?:\s+(?:ai|feature|automation|management|system|app|tool))/i,
      /(?:build|create|develop|start)\s+["']?([^"',.\n]+?)["']?(?:\s+(?:system|tool|platform|app|feature))/i,
      // Catch phrases like "I want to create X project"
      /(?:want to create|need to create|create)\s+["']?([^"',.\n]+?)["']?(?:\s+(?:project|system|app|tool|platform))/i,
      // Catch "X project" patterns
      /["']?([^"',.\n]+?)["']?(?:\s+(?:project|system|app|tool|platform|feature))/i
    ]
    
    let name = ''
    for (const pattern of namePatterns) {
      const match = conversationText.match(pattern)
      if (match && match[1] && match[1].trim().length > 2 && match[1].trim().length < 50) {
        name = match[1].trim()
        // Clean up common words that shouldn't be in project names
        name = name.replace(/\b(project|system|app|tool|platform|feature|the|a|an)\b/gi, '').trim()
        if (name.length > 2) {
          break
        }
      }
    }

    // Extract description/purpose with better patterns
    const descriptionPatterns = [
      // Direct purpose statements
      /(?:purpose is|goal is|description is|about|to)\s+["']?([^"',.\n]+?)["']?(?:\s|$|,|\.)/i,
      /(?:automate|create|build|develop|implement|manage|handle)\s+["']?([^"',.\n]+?)["']?(?:\s|$|,|\.)/i,
      /(?:for|that)\s+["']?([^"',.\n]+?)["']?(?:\s|$|,|\.)/i,
      // More specific patterns
      /(?:help|assist|support)\s+(?:with|us\s+with)\s+["']?([^"',.\n]+?)["']?(?:\s|$|,|\.)/i,
      /(?:need|want)\s+(?:to|a)\s+["']?([^"',.\n]+?)["']?(?:\s+(?:system|app|tool|platform|feature))/i
    ]
    
    let description = ''
    for (const pattern of descriptionPatterns) {
      const match = conversationText.match(pattern)
      if (match && match[1] && match[1].trim().length > 5) {
        description = match[1].trim()
        break
      }
    }

    // Extract department with better patterns
    const departmentPatterns = [
      /(?:department|team)\s+(?:is|will be)\s+["']?([^"',.\n]+?)["']?(?:\s|$|,|\.)/i,
      /(?:in\s+the\s+)?(engineering|marketing|sales|hr|finance|operations|product|design|qa|devops|data|security)\s+(?:department|team)/i,
      /(?:engineering|marketing|sales|hr|finance|operations|product|design|qa|devops|data|security)\s+(?:team|department)/i,
      /(?:for\s+the\s+)?(engineering|marketing|sales|hr|finance|operations|product|design|qa|devops|data|security)\s+(?:team|department)/i
    ]
    
    let department = ''
    for (const pattern of departmentPatterns) {
      const match = conversationText.match(pattern)
      if (match && match[1]) {
        department = match[1].trim()
        break
      }
    }

    // Extract priority with better patterns
    const priorityPatterns = [
      /(?:priority is|priority)\s+(high|medium|low|urgent|critical)/i,
      /(?:this is|it's|it is)\s+(high|medium|low|urgent|critical)\s+priority/i,
      /(?:urgent|critical|high|medium|low)\s+priority/i
    ]
    
    let priority = 'MEDIUM'
    for (const pattern of priorityPatterns) {
      const match = conversationText.match(pattern)
      if (match && match[1]) {
        priority = match[1].toUpperCase()
        break
      }
    }

    // Extract timeline with better patterns
    const timelinePatterns = [
      /(?:starting|start|begin)\s+(today|tomorrow|\d+\s*(?:days?|weeks?|months?)\s*(?:from\s+now)?)/i,
      /(?:timeline|duration|deadline)\s+(?:is\s+)?(\d+\s*(?:days?|weeks?|months?))/i,
      /(?:finish|complete|done)\s+(?:by|in)\s+(\d+\s*(?:days?|weeks?|months?))/i
    ]
    
    let startDate = null
    let endDate = null
    
    for (const pattern of timelinePatterns) {
      const match = conversationText.match(pattern)
      if (match && match[1]) {
        const timeline = match[1].toLowerCase()
        if (timeline.includes('today')) {
          startDate = new Date().toISOString()
        } else if (timeline.includes('tomorrow')) {
          startDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        } else {
          const durationMatch = timeline.match(/(\d+)\s*(days?|weeks?|months?)/)
          if (durationMatch) {
            const duration = parseInt(durationMatch[1])
            const unit = durationMatch[2].toLowerCase()
            const days = unit.includes('week') ? duration * 7 : 
                         unit.includes('month') ? duration * 30 : duration
            
            startDate = new Date().toISOString()
            endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
          }
        }
        break
      }
    }

    // If we still don't have a name, try to extract from the first meaningful user message
    if (!name) {
      const firstUserMessage = messages.find(msg => msg.role === 'user' && msg.content.length > 10)
      if (firstUserMessage) {
        const content = firstUserMessage.content.toLowerCase()
        // Look for common project creation phrases
        if (content.includes('create') || content.includes('build') || content.includes('develop')) {
          // Try to extract the main subject
          const subjectMatch = content.match(/(?:create|build|develop)\s+(?:a\s+)?(?:project\s+)?(?:called\s+)?["']?([^"',.\n]+?)["']?(?:\s+(?:for|to|that|which)|$|,|\.)/i)
          if (subjectMatch && subjectMatch[1] && subjectMatch[1].trim().length > 2) {
            name = subjectMatch[1].trim()
          }
        }
      }
    }

    // Final fallback - if we still don't have a name, use a more descriptive default
    if (!name || name.length < 3) {
      // Try to extract any meaningful words from the conversation
      const allWords = conversationText.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !['project', 'create', 'build', 'develop', 'want', 'need', 'help', 'with', 'this', 'that', 'will', 'should', 'could'].includes(word))
      
      if (allWords.length > 0) {
        // Take the first meaningful word and capitalize it
        name = allWords[0].charAt(0).toUpperCase() + allWords[0].slice(1)
      } else {
        name = 'New Project'
      }
    }

    const extractedData = {
      name: name || 'New Project',
      description: description || (name ? `Project: ${name}` : 'Project created via AI assistant'),
      department: department || 'General',
      team: department || 'General',
      priority,
      startDate,
      endDate,
      ownerId: 'dev-user-1'
    }

    console.log('Extracted project data:', extractedData)
    console.log('Original conversation text:', conversationText)
    console.log('Messages:', messages.map(m => ({ role: m.role, content: m.content })))
    return extractedData
  }

  const createProject = async () => {
    if (!session) return

    setIsLoading(true)
    try {
      // Extract project data from conversation
      const projectData = extractProjectData(messages)

      const response = await fetch('/api/assistant/create-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: session.id,
          projectData,
          templateId: selectedTemplate?.id
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setSession(prev => prev ? {
          ...prev,
          projectUrl: data.projectUrl,
          phase: 'project_created'
        } : null)
        
        // Add success message
        const successMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `🎉 **Project Created Successfully!**\n\nYour project "${data.project.name}" has been created.\n\n[📋 View Project](${data.projectUrl})`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, successMessage])
      }
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template)
    setShowTemplateSelector(false)
    
    // Add a message about template selection
    const templateMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Great choice! I've selected the "${template.name}" template for your project. This will help structure your project with predefined tasks and milestones.\n\nClick 'Create Project' in the sidebar when you're ready to proceed!`,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, templateMessage])
  }

  const handleShowTemplates = () => {
    setShowTemplateSelector(true)
  }

  const publishDraft = async () => {
    if (!session || !session.draftTitle || !session.draftBody) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/assistant/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: session.id,
          settings: draftSettings
        })
      })

      const data = await response.json()
      
      if (data.success && data.url) {
        setSession(prev => prev ? {
          ...prev,
          wikiUrl: data.url,
          phase: 'published'
        } : null)
        
        setShowPublishSheet(false)
        
        // Add a success message
        const successMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `✅ Your document has been published successfully! You can view it here: [${session.draftTitle}](${data.url})`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, successMessage])
      }
    } catch (error) {
      console.error('Error publishing draft:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDraftUpdate = async (newContent: string) => {
    if (!session) return

    try {
      setSession(prev => prev ? {
        ...prev,
        draftBody: newContent
      } : null)

      await fetch('/api/assistant/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          draftBody: newContent
        })
      })
    } catch (error) {
      console.error('Error updating draft:', error)
    }
  }

  const getPhaseBadge = (phase: string) => {
    const phaseMap: Record<string, { label: string; color: string }> = {
      'idle': { label: 'Getting Started', color: 'bg-gray-100 text-gray-800' },
      'intake': { label: 'Gathering Info', color: 'bg-blue-100 text-blue-800' },
      'gathering_requirements': { label: 'Requirements', color: 'bg-yellow-100 text-yellow-800' },
      'ready_to_draft': { label: 'Ready to Draft', color: 'bg-green-100 text-green-800' },
      'drafting': { label: 'Creating Draft', color: 'bg-purple-100 text-purple-800' },
      'draft_ready': { label: 'Draft Ready', color: 'bg-emerald-100 text-emerald-800' },
      'editing': { label: 'Editing', color: 'bg-orange-100 text-orange-800' },
      'publishing': { label: 'Publishing', color: 'bg-indigo-100 text-indigo-800' },
      'published': { label: 'Published', color: 'bg-green-100 text-green-800' }
    }
    
    return phaseMap[phase] || { label: phase, color: 'bg-gray-100 text-gray-800' }
  }

  const handleQuickAction = (action: string) => {
    setSelectedQuickActions(prev => 
      prev.includes(action) 
        ? prev.filter(a => a !== action)
        : [...prev, action]
    )
  }

  const quickActions = [
    "What are our remote work policies?",
    "Create a product requirements document for Lumi",
    "How do I set up my development environment?",
    "Draft an onboarding checklist for new employees"
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Chat History Sidebar */}
      {showHistory && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={startNewChat}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {chatHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No chat sessions yet</p>
            ) : (
              <div className="space-y-3">
                {chatHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                    onClick={() => loadSession(item.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.draftTitle || item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {item.intent === 'doc_gen' ? 'Document' : 'Assist'}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {new Date(item.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                        {item.wikiUrl && (
                          <div className="mt-1">
                            <a
                              href={item.wikiUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                              View Published
                            </a>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSession(item.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Session Actions */}
          {session && (
            <div className="p-6 border-t border-gray-200 space-y-4">
              {session.phase === 'ready_to_draft' && session.intent === 'doc_gen' && !session.draftTitle && (
                <Button 
                  className="w-full"
                  onClick={generateDraft}
                  disabled={isLoading}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {isLoading ? 'Generating...' : 'Generate Draft'}
                </Button>
              )}

              {session.phase === 'ready_to_create' && session.intent === 'project_creation' && !session.projectUrl && (
                <div className="space-y-2">
                  <Button 
                    className="w-full"
                    onClick={createProject}
                    disabled={isLoading}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {isLoading ? 'Creating...' : 'Create Project'}
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={handleShowTemplates}
                    disabled={isLoading}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Choose Template
                  </Button>
                  
                  {selectedTemplate && (
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <p className="text-xs font-medium text-blue-800">Selected Template:</p>
                      <p className="text-xs text-blue-600">{selectedTemplate.name}</p>
                    </div>
                  )}
                </div>
              )}

              {session && session.draftTitle && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Draft Ready</h4>
                  <p className="text-xs text-gray-500 truncate">{session.draftTitle}</p>
                  
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full"
                      onClick={() => setShowDraft(!showDraft)}
                    >
                      {showDraft ? 'Hide' : 'View'} Draft
                    </Button>
                    
                    {session.phase === 'draft_ready' && (
                      <Button 
                        size="sm"
                        className="w-full"
                        onClick={() => setShowPublishSheet(true)}
                      >
                        Publish to Wiki
                      </Button>
                    )}
                    
                    {session.wikiUrl && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(session.wikiUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Published
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl font-semibold text-gray-900">Ask Wiki</h1>
              </div>
              <p className="text-sm text-gray-600">AI-powered search and Q&A over your company's knowledge base.</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4 mr-2" />
                {showHistory ? 'Hide' : 'Show'} History
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {showWelcome ? (
            // Welcome Screen
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-full max-w-4xl">
                {/* AI Greeting */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium mb-2">
                        Hello! I'm Lumi AI, your intelligent documentation assistant. What can I help you with today?
                      </p>
                      <p className="text-gray-700">Please choose from the following options:</p>
                    </div>
                  </div>
                </div>

                {/* Main Options */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-200"
                    onClick={() => startSession('doc_gen')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Creating a Wiki</h3>
                          <p className="text-gray-600 text-sm">
                            I'll help you create comprehensive wiki pages, documents, policies, or procedures. 
                            I'll ask relevant questions to gather all necessary information and then generate 
                            a complete wiki page for you.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card 
                    className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-200"
                    onClick={() => startSession('assist')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Search className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">General Info</h3>
                          <p className="text-gray-600 text-sm">
                            I'll help you find information from existing wiki content and provide 
                            general guidance on various topics.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card 
                    className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-200"
                    onClick={() => startSession('project_creation')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Creating a Project</h3>
                          <p className="text-gray-600 text-sm">
                            I'll help you create a new project with all the necessary details. 
                            I'll ask about the project name, purpose, team, timeline, and other 
                            important information to set up your project properly.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Input Area */}
                <div className="space-y-4">
                  <p className="text-center text-gray-600 text-sm">
                    Simply click your choice or describe what you need help with!
                  </p>
                  
                  <form onSubmit={async (e) => {
                    e.preventDefault()
                    if (input.trim()) {
                      // Start a general assistance session
                      await startSession('assist')
                    }
                  }} className="flex space-x-3">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask me anything about your wiki or request document creation..."
                      className="flex-1 min-h-[48px] max-h-32 text-base resize-none"
                      disabled={isLoading}
                      rows={1}
                    />
                    <Button 
                      type="submit" 
                      disabled={!input.trim() || isLoading} 
                      className="h-12 px-6"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </form>

                  {/* Quick Actions */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {quickActions.map((action, index) => (
                        <label
                          key={index}
                          className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedQuickActions.includes(action)}
                            onChange={() => handleQuickAction(action)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{action}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Chat Interface
            <div className="flex-1 flex flex-col min-h-0">
              {/* Session Header */}
              {session && (
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">Mode:</span>
                        <Badge variant="outline">
                          {session.intent === 'doc_gen' ? 'Document Generation' : 'General Assistance'}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">Phase:</span>
                        <Badge className={getPhaseBadge(session.phase).color}>
                          {getPhaseBadge(session.phase).label}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startNewChat}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      New Chat
                    </Button>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div id="messages-container" className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-4xl px-6 py-4 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                              ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                              li: ({ children }) => <li className="mb-1">{children}</li>,
                              a: ({ href, children }) => (
                                <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-base">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-gray-500">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Scroll to Bottom Button */}
              {showScrollToBottom && (
                <Button
                  onClick={scrollToBottom}
                  className="absolute bottom-4 right-4 rounded-full shadow-lg"
                  size="sm"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              )}

              {/* Input */}
              {session && (
                <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
                  <form onSubmit={handleSubmit} className="flex space-x-3">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your message..."
                      className="flex-1 min-h-[48px] max-h-32 text-base resize-none"
                      disabled={isLoading}
                      rows={1}
                    />
                    <Button 
                      type="submit" 
                      disabled={!input.trim() || isLoading} 
                      className="h-12 px-6"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Draft Viewer */}
      {showDraft && session?.draftBody && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] w-full mx-4 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">{session.draftTitle}</h3>
              <Button variant="outline" onClick={() => setShowDraft(false)}>
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <MarkdownViewer 
                content={session.draftBody}
                title=""
                onSave={handleDraftUpdate}
                editable={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Publish Sheet */}
      {showPublishSheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Publish to Wiki</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={draftSettings.category}
                  onChange={(e) => setDraftSettings(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="general">General</option>
                  <option value="policy">Policy</option>
                  <option value="procedure">Procedure</option>
                  <option value="guide">Guide</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visibility
                </label>
                <select
                  value={draftSettings.visibility}
                  onChange={(e) => setDraftSettings(prev => ({ ...prev, visibility: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="public">Public</option>
                  <option value="team">Team</option>
                  <option value="private">Private</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={draftSettings.tags.join(', ')}
                  onChange={(e) => setDraftSettings(prev => ({ 
                    ...prev, 
                    tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="policy, devices, security"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="reviewRequired"
                  checked={draftSettings.reviewRequired}
                  onChange={(e) => setDraftSettings(prev => ({ ...prev, reviewRequired: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="reviewRequired" className="text-sm text-gray-700">
                  Require review before publishing
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={() => setShowPublishSheet(false)}>
                Cancel
              </Button>
              <Button onClick={publishDraft} disabled={isLoading}>
                {isLoading ? 'Publishing...' : 'Publish'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Template Selector */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelectTemplate={handleTemplateSelect}
      />
    </div>
  )
}