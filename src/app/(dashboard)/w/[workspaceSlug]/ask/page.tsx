"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Send, 
  Plus, 
  History, 
  Clock, 
  Trash2, 
  Loader2, 
  ChevronDown,
  Sparkles,
  Zap,
  Brain,
  Search,
  RefreshCw,
  FileText,
  Lightbulb,
  ListChecks,
  HelpCircle
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SourceCitations } from '@/components/ai/source-citations'
import { AILogo } from '@/components/ai-logo'
import { cn } from "@/lib/utils"

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
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([])
  const [_isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  // Default to Gemini 2.5 Flash
  const [selectedModel, setSelectedModel] = useState(MODELS.find(m => m.id === 'gemini-2.5-flash') || MODELS[0])
  const [showQuickStart, setShowQuickStart] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
    setShowQuickStart(true)
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!input.trim() || isLoading) return
    
    setShowQuickStart(false)
    
    if (currentSession) {
      await sendMessage(input)
    } else {
      // Create session first, then send message
      await createNewSession(selectedModel.id)
      // Wait a bit for session to be created
      setTimeout(() => {
        if (input.trim()) {
          sendMessage(input)
        }
      }, 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleQuickStartClick = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  const getModelInfo = (modelId: string) => {
    return MODELS.find(m => m.id === modelId) || MODELS[0]
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Minimal Header - Only show when there are messages */}
      {messages.length > 0 && (
        <div className="border-b border-border px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-end max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={startNewChat}
              >
                <Plus className="h-4 w-4 mr-2" />
                New chat
              </Button>
              {chatHistory.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <History className="h-4 w-4 mr-2" />
                    History
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                  <DropdownMenuLabel>Recent chats</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {chatHistory.map((item) => {
                    const modelInfo = getModelInfo(item.model)
                    return (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => loadSession(item.id)}
                        className="flex flex-col items-start gap-1 py-3"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm font-medium truncate flex-1">
                            {item.title}
                          </span>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
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
                              className="h-6 w-6 p-0 text-destructive"
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
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {modelInfo.name}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(item.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {messages.length === 0 ? (
        /* Empty State - Centered with Quick Start */
        <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
          <div className={cn(
            "w-full max-w-2xl space-y-8 transition-opacity duration-300",
            showQuickStart ? "animate-in fade-in-0 duration-200" : ""
          )}>
            {/* Logo above heading */}
            <div className="flex justify-center mb-6">
              <AILogo 
                width={64} 
                height={64} 
                className="w-16 h-16 opacity-80"
              />
            </div>
            
            {/* Engaging Heading */}
            <h1 className="text-4xl font-bold text-center text-foreground">
              What can I help you with?
            </h1>
            
            {/* Large Prominent Input with Model Selector Inside */}
            <div className="relative">
              <Input
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything, draft content, brainstorm ideas..."
                className="h-14 text-base pr-28 text-foreground"
                disabled={isLoading}
              />
              {/* Model Selector Inside Input */}
              <div className="absolute right-14 top-1/2 -translate-y-1/2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                      {selectedModel.icon && <selectedModel.icon className="h-3 w-3" />}
                      <span>{selectedModel.name}</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="bottom" sideOffset={4} className="w-64">
                    <DropdownMenuLabel>Select AI Model</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {MODELS.map((model) => (
                      <DropdownMenuItem
                        key={model.id}
                        onClick={() => setSelectedModel(model)}
                        className="flex items-start gap-3 py-3"
                      >
                        <model.icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{model.name}</div>
                          <div className="text-xs text-muted-foreground">{model.description}</div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {/* Send Button */}
              <Button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 px-3"
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>
            
            {/* Quick-Start Suggestion Cards */}
            {showQuickStart && (
              <div className={cn(
                "grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in-0 duration-300 delay-200"
              )}>
                <Card
                  className="cursor-pointer hover:bg-accent/50 transition-all duration-200 border-border/50 bg-card/50"
                  onClick={() => handleQuickStartClick("Help me draft a professional document about ")}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Draft a document</span>
                  </CardContent>
                </Card>
                
                <Card
                  className="cursor-pointer hover:bg-accent/50 transition-all duration-200 border-border/50 bg-card/50"
                  onClick={() => handleQuickStartClick("Let's brainstorm ideas for ")}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Lightbulb className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Brainstorm ideas</span>
                  </CardContent>
                </Card>
                
                <Card
                  className="cursor-pointer hover:bg-accent/50 transition-all duration-200 border-border/50 bg-card/50"
                  onClick={() => handleQuickStartClick("Summarize this for me: ")}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <ListChecks className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Summarize content</span>
                  </CardContent>
                </Card>
                
                <Card
                  className="cursor-pointer hover:bg-accent/50 transition-all duration-200 border-border/50 bg-card/50"
                  onClick={() => handleQuickStartClick("I have a question about ")}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <HelpCircle className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Answer a question</span>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Active Chat View - Centered Messages */
        <>
          <div id="messages-container" className="flex-1 overflow-y-auto p-6 min-h-0">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div>
                        <div className="prose prose-sm max-w-none dark:prose-invert">
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
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          {/* Scroll to Bottom Button */}
          {showScrollToBottom && (
            <Button
              onClick={scrollToBottom}
              className="absolute bottom-24 right-6 rounded-full shadow-lg"
              size="sm"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}
        </>
      )}

      {/* Input Bar - Always at Bottom */}
      {messages.length > 0 && (
        <div className="border-t border-border p-4 flex-shrink-0">
          <div className="max-w-3xl mx-auto relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything, draft content, brainstorm ideas..."
              className="h-12 text-base pr-28"
              disabled={isLoading}
            />
            {/* Model Selector Inside Input */}
            <div className="absolute right-14 top-1/2 -translate-y-1/2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                    {selectedModel.icon && <selectedModel.icon className="h-3 w-3" />}
                    <span>{selectedModel.name}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom" sideOffset={4} className="w-64">
                  <DropdownMenuLabel>Select AI Model</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {MODELS.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setSelectedModel(model)}
                      className="flex items-start gap-3 py-3"
                    >
                      <model.icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{model.name}</div>
                        <div className="text-xs text-muted-foreground">{model.description}</div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* Send Button */}
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-8 px-3"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}