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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SourceCitations } from '@/components/ai/source-citations'
import { AILogo } from '@/components/ai-logo'

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
  // Default to Gemini 2.5 Flash
  const [selectedModel, setSelectedModel] = useState(MODELS.find(m => m.id === 'gemini-2.5-flash') || MODELS[0])
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
    // Use the currently selected model (defaults to Gemini 2.5 Flash)
    createNewSession(selectedModel.id)
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

    // Create placeholder AI message for streaming
    const aiMessageId = (Date.now() + 1).toString()
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      model: currentSession.model
    }

    setMessages(prev => [...prev, aiMessage])

    try {
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          sessionId: currentSession.id,
          model: currentSession.model
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body reader available')
      }

      let buffer = ''
      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.error) {
                throw new Error(data.error)
              }

              if (data.content) {
                accumulatedContent += data.content
                // Update the message content as chunks arrive
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId 
                    ? { ...msg, content: accumulatedContent }
                    : msg
                ))
              }

              if (data.done) {
                setIsLoading(false)
                loadChatHistory()
                return
              }
            } catch (e) {
              // Skip invalid JSON lines
              if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
                console.error('Error parsing stream data:', e)
              }
            }
          }
        }
      }

      setIsLoading(false)
      loadChatHistory()
    } catch (error) {
      console.error('Error sending message:', error)
      setIsLoading(false)
      
      // Update the message with error
      const errorMessage = error instanceof Error 
        ? `Sorry, I encountered an error: ${error.message}. Please try again or select a different model.`
        : "Sorry, I encountered an error. Please try again or select a different model."
      
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: errorMessage }
          : msg
      ))
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
                <AILogo 
                  width={32} 
                  height={32} 
                  className="w-8 h-8"
                />
                <h1 className="text-2xl font-semibold text-foreground">LoopBrain</h1>
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
              <Select
                value={currentSession?.model || selectedModel.id}
                onValueChange={(value) => {
                  const model = MODELS.find(m => m.id === value)
                  if (model) {
                    setSelectedModel(model)
                    // If there's an active session, update it
                    if (currentSession) {
                      // Create a new session with the selected model
                      createNewSession(value)
                    }
                  }
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div id="messages-container" className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0 max-h-[calc(100vh-10rem)]">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-full max-w-2xl text-center">
                <div className="mx-auto mb-6">
                  <AILogo 
                    width={64} 
                    height={64} 
                    className="w-16 h-16"
                  />
                </div>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  Welcome to LoopBrain
                </h2>
                <p className="text-muted-foreground mb-8">
                  Start a conversation with AI. Select your preferred model from the dropdown above.
                </p>
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

    </div>
  )
}