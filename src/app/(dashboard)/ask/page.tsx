"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Send, 
  Bot, 
  Plus, 
  X, 
  History, 
  Clock, 
  Trash2, 
  ExternalLink, 
  Loader2, 
  ChevronDown,
  Settings,
  Sparkles,
  Zap,
  Brain,
  MessageSquare,
  Search,
  RefreshCw
} from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SourceCitations } from '@/components/ai/source-citations'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  model?: string
  sources?: Array<{
    type: 'wiki' | 'project' | 'task' | 'org' | 'activity' | 'onboarding' | 'documentation'
    id: string
    title: string
    url?: string
    excerpt?: string
  }>
}

interface Session {
  id: string
  title: string
  model: string
  createdAt: Date
  updatedAt: Date
  messageCount: number
}

interface ChatHistoryItem {
  id: string
  title: string
  model: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

const MODELS = [
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Best for complex reasoning and analysis',
    provider: 'OpenAI',
    icon: Brain,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude 3.5 Sonnet',
    description: 'Excellent for creative writing and code',
    provider: 'Anthropic',
    icon: Sparkles,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Fast and efficient for quick tasks',
    provider: 'OpenAI',
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Advanced reasoning and multimodal capabilities',
    provider: 'Google',
    icon: Search,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fast and efficient for quick tasks',
    provider: 'Google',
    icon: Search,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  }
]

export default function AskPage() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(true)
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [selectedModel, setSelectedModel] = useState(MODELS[0])
  const [showModelSelector, setShowModelSelector] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory()
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-resize textarea when input changes
  useEffect(() => {
    adjustTextareaHeight()
  }, [input])

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
      const response = await fetch('/api/ai/chat-sessions?limit=20')
      const data = await response.json()
      setChatHistory(data.sessions || [])
    } catch (error) {
      console.error('Error loading chat history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const startNewChat = () => {
    setCurrentSession(null)
    setMessages([])
    setShowModelSelector(true)
  }

  const createNewSession = async (modelId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ai/chat-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model: modelId,
          title: 'New Chat'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setCurrentSession({
          id: data.sessionId,
          title: 'New Chat',
          model: modelId,
          createdAt: new Date(),
          updatedAt: new Date(),
          messageCount: 0
        })
        setShowModelSelector(false)
        loadChatHistory()
      }
    } catch (error) {
      console.error('Error creating session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSession = async (sessionId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/ai/chat-sessions/${sessionId}`)
      const data = await response.json()
      
      if (data.success) {
        setCurrentSession({
          id: data.session.id,
          title: data.session.title,
          model: data.session.model,
          createdAt: new Date(data.session.createdAt),
          updatedAt: new Date(data.session.updatedAt),
          messageCount: data.session.messageCount
        })
        
        // Load messages for this session
        const messagesResponse = await fetch(`/api/ai/chat-sessions/${sessionId}/messages`)
        const messagesData = await messagesResponse.json()
        
        if (messagesData.success && messagesData.messages) {
          const formattedMessages = messagesData.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.type === 'USER' ? 'user' : 'assistant',
            content: msg.content,
            timestamp: new Date(msg.createdAt),
            model: msg.metadata?.model,
            sources: msg.metadata?.sources
          }))
          setMessages(formattedMessages)
        }
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
      if (currentSession?.id === sessionId) {
        setCurrentSession(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  const regenerateTitle = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/ai/chat-sessions/${sessionId}/regenerate-title`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Update the current session if it's the one being regenerated
        if (currentSession?.id === sessionId) {
          setCurrentSession(prev => prev ? { ...prev, title: data.title } : null)
        }
        
        // Reload chat history to show updated title
        loadChatHistory()
      }
    } catch (error) {
      console.error('Error regenerating title:', error)
    }
  }

  const sendMessage = async (message: string) => {
    if (!message.trim() || !currentSession) return

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
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          sessionId: currentSession.id,
          model: currentSession.model
        })
      })

      const data = await response.json()
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || 'I received your message but had trouble processing it. Please try again.',
        timestamp: new Date(),
        model: currentSession.model,
        sources: data.sources
      }

      setMessages(prev => [...prev, aiMessage])
      loadChatHistory()
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
      if (currentSession) {
        sendMessage(input)
      } else {
        startNewChat()
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    adjustTextareaHeight()
  }

  const getModelInfo = (modelId: string) => {
    return MODELS.find(m => m.id === modelId) || MODELS[0]
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      {showHistory && (
        <div className="w-80 bg-muted border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Chat History</h2>
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
          
          <div className="flex-1 overflow-y-auto">
            {chatHistory.length === 0 ? (
              <div className="p-4 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No chat sessions yet</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {chatHistory.map((item) => {
                  const modelInfo = getModelInfo(item.model)
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-border hover:bg-card cursor-pointer transition-colors"
                      onClick={() => loadSession(item.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {modelInfo.name}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(item.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation()
                              regenerateTitle(item.id)
                            }}
                            title="Regenerate title"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteSession(item.id)
                            }}
                            title="Delete chat"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen max-h-screen">
        {/* Header */}
        <div className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl font-semibold text-foreground">Ask AI</h1>
              </div>
              {currentSession && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Using</span>
                  <Badge variant="outline" className="text-xs">
                    {getModelInfo(currentSession.model).name}
                  </Badge>
                </div>
              )}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowModelSelector(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Models
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div id="messages-container" className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0 max-h-[calc(100vh-10rem)]">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-full max-w-2xl text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Bot className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  Welcome to Ask AI
                </h2>
                <p className="text-muted-foreground mb-8">
                  Choose an AI model and start a conversation. Each model has different strengths for different tasks.
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  {MODELS.map((model) => {
                    const Icon = model.icon
                    return (
                      <Card 
                        key={model.id}
                        className={`cursor-pointer hover:shadow-md transition-all border-2 hover:${model.borderColor} ${currentSession?.model === model.id ? model.borderColor : 'border-border'}`}
                        onClick={() => {
                          if (!currentSession) {
                            createNewSession(model.id)
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className={`w-10 h-10 ${model.bgColor} rounded-lg flex items-center justify-center`}>
                              <Icon className={`h-5 w-5 ${model.color}`} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{model.name}</h3>
                              <p className="text-sm text-muted-foreground">{model.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl px-4 py-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div>
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
                        {message.sources && message.sources.length > 0 && (
                          <SourceCitations sources={message.sources} />
                        )}
                      </div>
                    ) : (
                      <p className="text-base">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Scroll to Bottom Button */}
        {showScrollToBottom && (
          <Button
            onClick={scrollToBottom}
            className="absolute bottom-20 right-6 rounded-full shadow-lg"
            size="sm"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}

        {/* Input */}
        <div className="bg-card border-t border-border p-4 flex-shrink-0 pb-6">
          <form onSubmit={handleSubmit} className="flex space-x-3 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Shift+Enter for new line)"
              className="flex-1 min-h-[44px] max-h-32 resize-none"
              disabled={isLoading}
              rows={1}
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || isLoading} 
              className="px-6 h-11"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Model Selector Modal */}
      {showModelSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">Choose AI Model</h3>
              <Button variant="outline" onClick={() => setShowModelSelector(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              {MODELS.map((model) => {
                const Icon = model.icon
                return (
                  <Card 
                    key={model.id}
                    className={`cursor-pointer hover:shadow-md transition-all border-2 hover:${model.borderColor} ${selectedModel.id === model.id ? model.borderColor : 'border-border'}`}
                    onClick={() => setSelectedModel(model)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 ${model.bgColor} rounded-lg flex items-center justify-center`}>
                          <Icon className={`h-6 w-6 ${model.color}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">{model.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{model.description}</p>
                          <p className="text-xs text-muted-foreground">Provider: {model.provider}</p>
                        </div>
                        {selectedModel.id === model.id && (
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t">
              <Button variant="outline" onClick={() => setShowModelSelector(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  createNewSession(selectedModel.id)
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Start Chat'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}