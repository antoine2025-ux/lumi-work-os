"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Send, 
  MessageSquare, 
  BookOpen, 
  FileText,
  Search,
  Sparkles,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Loader2,
  CheckCircle,
  ExternalLink,
  FileEdit,
  History,
  Trash2,
  Edit3,
  Menu,
  X
} from "lucide-react"
import Link from "next/link"

interface Message {
    id: string
    type: 'user' | 'ai'
    content: string
    sources?: Array<{
      title: string
      url: string
      excerpt: string
    }>
  isTyping?: boolean
  documentPlan?: {
    title: string
    structure?: string[]
    questions?: string[]
  }
  wikiPage?: {
    title: string
    content: string
    category: string
    visibility: string
    slug: string
  }
}

interface ChatSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: Message[]
  _count: {
    messages: number
  }
}

export default function AskWikiPage() {
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content: "Hello! I'm Lumi AI, your intelligent documentation assistant. I can help you find information, answer questions, and even create comprehensive wiki pages based on your requirements. What would you like to work on today?",
      sources: []
    }
  ])
  const [documentCreationMode, setDocumentCreationMode] = useState(false)
  const [wikiParameters, setWikiParameters] = useState({
    category: '',
    visibility: 'public',
    title: '',
    content: ''
  })
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true) // Show sidebar by default
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)

  // Helper function to clean HTML content for preview
  const cleanHtmlForPreview = (html: string) => {
    // Remove HTML tags but preserve structure
    return html
      .replace(/<h1[^>]*>/gi, '\n# ')
      .replace(/<h2[^>]*>/gi, '\n## ')
      .replace(/<h3[^>]*>/gi, '\n### ')
      .replace(/<h4[^>]*>/gi, '\n#### ')
      .replace(/<h5[^>]*>/gi, '\n##### ')
      .replace(/<h6[^>]*>/gi, '\n###### ')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<\/li>/gi, '')
      .replace(/<ul[^>]*>/gi, '\n')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol[^>]*>/gi, '\n')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<strong[^>]*>/gi, '**')
      .replace(/<\/strong>/gi, '**')
      .replace(/<b[^>]*>/gi, '**')
      .replace(/<\/b>/gi, '**')
      .replace(/<em[^>]*>/gi, '*')
      .replace(/<\/em>/gi, '*')
      .replace(/<i[^>]*>/gi, '*')
      .replace(/<\/i>/gi, '*')
      .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Clean up multiple newlines
      .trim()
  }

  // Load chat sessions on component mount
  useEffect(() => {
    const loadChatSessions = async () => {
      try {
        console.log('🔄 Loading chat sessions...')
        const response = await fetch('/api/ai/chat-sessions?workspaceId=workspace-1')
        console.log('📡 Response status:', response.status, response.ok)
        
        if (response.ok) {
          const sessions = await response.json()
          console.log('✅ Loaded sessions:', sessions)
          setChatSessions(sessions)
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('❌ Failed to load chat sessions:', errorData)
        }
      } catch (error) {
        console.error('💥 Error loading chat sessions:', error)
      } finally {
        setIsLoadingSessions(false)
      }
    }

    loadChatSessions()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isLoading) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
    }
    setMessages(prev => [...prev, userMessage])

    // Add typing indicator
    const typingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: '',
      isTyping: true
    }
    setMessages(prev => [...prev, typingMessage])

    setIsLoading(true)
    setQuery("")

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: query,
          context: 'wiki_assistant',
          workspaceId: 'workspace-1',
          sessionId: currentSessionId
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('API Error:', errorData)
        throw new Error(`Failed to get AI response: ${errorData.error || 'Unknown error'}`)
      }

      const data = await response.json()
      
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => !msg.isTyping))

      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'ai',
        content: data.content,
        sources: data.sources,
        documentPlan: data.documentPlan,
        wikiPage: data.wikiPage
      }
      setMessages(prev => [...prev, aiMessage])

      // Check if we're in document creation mode
      if (data.documentPlan) {
        setDocumentCreationMode(true)
        setWikiParameters(prev => ({
          ...prev,
          title: data.documentPlan.title,
          content: data.content || ''
        }))
      }

    } catch (error) {
      console.error('Error getting AI response:', error)
      
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => !msg.isTyping))
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'ai',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        sources: []
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateWikiPage = async () => {
    if (!wikiParameters.title || !wikiParameters.content) return

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/wiki/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId: 'workspace-1',
          title: wikiParameters.title,
          content: wikiParameters.content,
          category: wikiParameters.category,
          tags: [],
          isPublished: wikiParameters.visibility === 'public'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create wiki page')
      }

      const newPage = await response.json()
      
      // Add success message with link
      const successMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `Perfect! I've created your wiki page "${wikiParameters.title}". You can view and edit it using the link below.`,
        wikiPage: {
          title: newPage.title,
          content: newPage.content,
          category: newPage.category,
          visibility: wikiParameters.visibility,
          slug: newPage.slug
        }
      }
      setMessages(prev => [...prev, successMessage])
      
      // Reset form
      setDocumentCreationMode(false)
      setWikiParameters({
        category: '',
        visibility: 'public',
        title: '',
        content: ''
      })

    } catch (error) {
      console.error('Error creating wiki page:', error)
      alert('Failed to create wiki page. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const createNewChat = async () => {
    try {
      console.log('🆕 Creating new chat session...')
      const response = await fetch('/api/ai/chat-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Chat',
          workspaceId: 'workspace-1'
        })
      })

      console.log('📡 Create response:', response.status, response.ok)

      if (response.ok) {
        const newSession = await response.json()
        console.log('✅ Created session:', newSession)
        setCurrentSessionId(newSession.id)
        setMessages([{
          id: "1",
          type: "ai",
          content: "Hello! I'm Lumi AI, your intelligent documentation assistant. I can help you find information, answer questions, and even create comprehensive wiki pages based on your requirements. What would you like to work on today?",
          sources: []
        }])
        setDocumentCreationMode(false)
        setWikiParameters({
          category: '',
          visibility: 'public',
          title: '',
          content: ''
        })
        
        // Reload sessions
        console.log('🔄 Reloading sessions...')
        const sessionsResponse = await fetch('/api/ai/chat-sessions?workspaceId=workspace-1')
        if (sessionsResponse.ok) {
          const sessions = await sessionsResponse.json()
          console.log('✅ Reloaded sessions:', sessions)
          setChatSessions(sessions)
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ Failed to create chat session:', errorData)
      }
    } catch (error) {
      console.error('💥 Error creating new chat:', error)
    }
  }

  const loadChatSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/ai/chat-sessions/${sessionId}`)
      if (response.ok) {
        const session = await response.json()
        setCurrentSessionId(sessionId)
        setMessages(session.messages || [])
        setDocumentCreationMode(false)
        setWikiParameters({
          category: '',
          visibility: 'public',
          title: '',
          content: ''
        })
      }
    } catch (error) {
      console.error('Error loading chat session:', error)
    }
  }

  const deleteChatSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/ai/chat-sessions/${sessionId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setChatSessions(prev => prev.filter(session => session.id !== sessionId))
        if (currentSessionId === sessionId) {
          setCurrentSessionId(null)
          setMessages([{
            id: "1",
            type: "ai",
            content: "Hello! I'm Lumi AI, your intelligent documentation assistant. I can help you find information, answer questions, and even create comprehensive wiki pages based on your requirements. What would you like to work on today?",
            sources: []
          }])
        }
      }
    } catch (error) {
      console.error('Error deleting chat session:', error)
    }
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r bg-gray-50`}>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Chat History</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            onClick={createNewChat}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {isLoadingSessions ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="p-3 bg-gray-200 rounded-lg animate-pulse">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {console.log('🎨 Rendering sessions:', chatSessions.length, 'sessions')}
                {chatSessions.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-4">
                    No chat sessions yet
                  </div>
                ) : (
                  chatSessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentSessionId === session.id
                      ? 'bg-blue-100 border border-blue-200'
                      : 'bg-white hover:bg-gray-100 border border-gray-200'
                  }`}
                  onClick={() => loadChatSession(session.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {session.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {session._count.messages} messages
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(session.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteChatSession(session.id)
                      }}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
    <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold flex items-center space-x-2">
          <MessageSquare className="h-8 w-8 text-primary" />
          <span>Ask Wiki</span>
        </h1>
        <p className="text-muted-foreground">
          AI-powered search and Q&A over your company's knowledge base
        </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:flex"
              >
                <Menu className="h-4 w-4 mr-2" />
                {sidebarOpen ? 'Hide' : 'Show'} History
              </Button>
            </div>
      </div>

      {/* Chat Interface */}
      <div className="flex flex-col h-[600px]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.type === 'ai' && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        {message.isTyping ? (
                          <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
                        ) : (
                        <Sparkles className="h-4 w-4 text-primary-foreground" />
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex-1">
                    {message.isTyping ? (
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-sm text-gray-500">Lumi AI is thinking...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        
                        {/* Document Plan */}
                        {message.documentPlan && (
                          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center space-x-2 mb-3">
                              <FileEdit className="h-4 w-4 text-blue-600" />
                              <h4 className="font-medium text-blue-900">Document Plan: {message.documentPlan.title}</h4>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <p className="text-sm font-medium text-blue-800 mb-1">Structure:</p>
                                <ul className="text-sm text-blue-700 space-y-1">
                                  {message.documentPlan.structure && message.documentPlan.structure.map((item, index) => (
                                    <li key={index} className="flex items-center space-x-2">
                                      <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              {message.documentPlan.questions && message.documentPlan.questions.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-blue-800 mb-1">Questions to clarify:</p>
                                  <ul className="text-sm text-blue-700 space-y-1">
                                    {message.documentPlan.questions.map((question, index) => (
                                      <li key={index} className="flex items-center space-x-2">
                                        <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                                        <span>{question}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Wiki Page Link */}
                        {message.wikiPage && (
                          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center space-x-2 mb-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <h4 className="font-medium text-green-900">Wiki Page Created!</h4>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm text-green-700">
                                <strong>Title:</strong> {message.wikiPage.title}
                              </p>
                              <p className="text-sm text-green-700">
                                <strong>Category:</strong> {message.wikiPage.category}
                              </p>
                              <p className="text-sm text-green-700">
                                <strong>Visibility:</strong> {message.wikiPage.visibility}
                              </p>
                              <Link href={`/wiki/${message.wikiPage.slug}`}>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View Page
                                </Button>
                              </Link>
                            </div>
                          </div>
                        )}
                    
                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium opacity-70">Sources:</p>
                        {message.sources.map((source, index) => (
                              <div key={index} className="text-xs bg-background/50 rounded p-2 hover:bg-background/70 transition-colors">
                            <div className="flex items-center space-x-1 mb-1">
                              <BookOpen className="h-3 w-3" />
                                  <Link 
                                    href={source.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="font-medium hover:text-blue-600 transition-colors cursor-pointer"
                                  >
                                    {source.title}
                                  </Link>
                                  <ExternalLink className="h-2 w-2 text-gray-400" />
                            </div>
                                <p className="opacity-70 text-xs leading-relaxed overflow-hidden" style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical'
                                }}>{source.excerpt}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons for AI messages */}
                        {message.type === 'ai' && !message.isTyping && (
                      <div className="flex items-center space-x-2 mt-3">
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <div className="flex-1 relative">
            <Textarea
              placeholder="Ask me anything about your wiki or request document creation..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                // Auto-resize textarea
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (query.trim() && !isLoading) {
                    handleSubmit(e)
                  }
                }
              }}
              className="pr-10 min-h-[40px] max-h-[120px] resize-none"
              disabled={isLoading}
              rows={1}
            />
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          </div>
          <Button type="submit" disabled={!query.trim() || isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
            <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>

      {/* Document Creation Interface */}
      {documentCreationMode && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-900">
              <FileEdit className="h-5 w-5" />
              <span>Create Wiki Page</span>
            </CardTitle>
            <CardDescription className="text-blue-700">
              Configure the parameters for your new wiki page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={wikiParameters.category} onValueChange={(value) => setWikiParameters(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="hr">Human Resources</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select value={wikiParameters.visibility} onValueChange={(value) => setWikiParameters(prev => ({ ...prev, visibility: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Page Title</Label>
              <Input
                id="title"
                value={wikiParameters.title}
                onChange={(e) => setWikiParameters(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter page title"
              />
            </div>

            {wikiParameters.content && (
              <div className="space-y-2">
                <Label>Content Preview</Label>
                <div className="max-h-40 overflow-y-auto p-3 bg-gray-50 rounded-lg border text-sm">
                  <div className="whitespace-pre-wrap font-sans">{cleanHtmlForPreview(wikiParameters.content)}</div>
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <Button 
                onClick={handleCreateWikiPage}
                disabled={!wikiParameters.title || !wikiParameters.content || isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Wiki Page
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setDocumentCreationMode(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Questions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Quick Actions</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {[
            "What are our remote work policies?",
            "How do I set up my development environment?",
            "Create a product requirements document for Lumi",
            "Draft an onboarding checklist for new employees"
          ].map((question) => (
            <Button
              key={question}
              variant="outline"
              className="justify-start text-left h-auto p-3"
              onClick={() => setQuery(question)}
              disabled={isLoading}
            >
              <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm">{question}</span>
            </Button>
          ))}
        </div>
      </div>
        </div>
      </div>
    </div>
  )
}
