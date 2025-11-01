"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { 
  Sparkles, 
  Send, 
  X, 
  Minus,
  Maximize2,
  Mic,
  Loader2,
  FileText,
  Sidebar,
  Move,
  ChevronDown,
  Check,
  FileEdit
} from "lucide-react"
import { AIPreviewCard } from "./ai-preview-card"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface WikiAIAssistantProps {
  onContentUpdate?: (content: string) => void
  onTitleUpdate?: (title: string) => void
  currentContent?: string
  currentTitle?: string
  currentPageId?: string
  selectedText?: string
  onOpenChange?: (isOpen: boolean) => void
  onDisplayModeChange?: (mode: 'sidebar' | 'floating') => void
  mode?: 'bottom-bar' | 'floating-button' // 'bottom-bar' for wiki pages, 'floating-button' for other pages
}

interface LoopwellAIResponse {
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

export function WikiAIAssistant({ 
  onContentUpdate, 
  onTitleUpdate,
  currentContent = '', 
  currentTitle = 'New page',
  currentPageId,
  selectedText,
  onOpenChange,
  onDisplayModeChange,
  mode = 'bottom-bar' // Default to bottom-bar for wiki pages
}: WikiAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  // Default display mode based on component mode
  const [displayMode, setDisplayMode] = useState<'sidebar' | 'floating'>(mode === 'floating-button' ? 'floating' : 'sidebar')
  const [showDisplayModeDropdown, setShowDisplayModeDropdown] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pendingPreview, setPendingPreview] = useState<LoopwellAIResponse | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDisplayModeDropdown(false)
      }
    }

    if (showDisplayModeDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDisplayModeDropdown])

  // Create or get session ID
  useEffect(() => {
    if (!sessionId && isOpen) {
      const createSession = async () => {
        try {
          const response = await fetch('/api/ai/chat-sessions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4-turbo',
              title: currentTitle || 'Wiki Chat'
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            setSessionId(data.sessionId)
          }
        } catch (error) {
          console.error('Failed to create chat session:', error)
        }
      }
      createSession()
    }
  }, [isOpen, sessionId, currentTitle])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    // Open panel when first message is sent
    if (!isOpen) {
      setIsOpen(true)
      onOpenChange?.(true)
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput("")
    setIsLoading(true)

    try {
      // Wait for session ID if not ready yet
      let currentSessionId = sessionId
      if (!currentSessionId) {
        const sessionResponse = await fetch('/api/ai/chat-sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo',
            title: currentTitle || 'Wiki Chat'
          })
        })
        
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json()
          currentSessionId = sessionData.sessionId
          setSessionId(currentSessionId)
        } else {
          throw new Error('Failed to create session')
        }
      }

      // Call LoopwellAI API with context
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          sessionId: currentSessionId,
          model: 'gpt-4-turbo',
          context: {
            pageId: currentPageId,
            title: currentTitle,
            content: currentContent,
            selectedText: selectedText
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data: LoopwellAIResponse = await response.json()
      
      // Handle structured response based on intent
      const requiresPreview = [
        'create_new_page',
        'append_to_page', 
        'improve_existing_page',
        'extract_tasks',
        'tag_pages'
      ].includes(data.intent)
      
      if (requiresPreview) {
        // Show preview card for confirmation
        setPendingPreview(data)
        
        // Show a message indicating preview is ready
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I've prepared a ${data.intent.replace('_', ' ')}. Please review the preview below and confirm to proceed.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        // For answer, find_things, do_nothing - show response directly
        const content = data.preview?.markdown || data.rationale
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: content || 'Sorry, I could not generate a response.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const quickActions = [
    { label: "AI Meeting Notes", icon: FileText },
    { label: "Database", icon: FileText },
    { label: "Form", icon: FileText },
    { label: "Templates", icon: Sparkles }
  ]

  // Floating button for when closed in floating-button mode
  const FloatingButton = mode === 'floating-button' && !isOpen ? (
    <button
      onClick={() => {
        setIsOpen(true)
        onOpenChange?.(true)
        // Ensure floating mode when opened from button
        setDisplayMode('floating')
        onDisplayModeChange?.('floating')
      }}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 z-50 flex items-center justify-center group"
      aria-label="Open AI Assistant"
    >
      <Sparkles className="h-6 w-6 group-hover:scale-110 transition-transform" />
    </button>
  ) : null

  return (
    <>
      {FloatingButton}
      {/* Unified AI Container - Transforms from bottom to right */}
      <div 
        className={cn(
          "fixed bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col",
          "transition-all duration-500 ease-in-out z-50",
          isOpen 
            ? displayMode === 'floating'
              ? "top-[50%] right-4 -translate-y-1/2 h-[600px] rounded-lg w-[500px]"
              : "right-0 top-0 h-full rounded-none w-full md:w-96"
            : mode === 'floating-button'
              ? "hidden" // Hidden when closed in floating-button mode (button shown separately)
              : "bottom-4 left-1/2 -translate-x-1/2 rounded-lg max-w-2xl"
        )}
        style={isOpen ? {} : mode === 'bottom-bar' ? { width: 'calc(100% - 2rem)' } : {}}
      >
        {/* Header - Only visible when open */}
        {isOpen && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div className="flex items-center gap-2 relative" ref={dropdownRef}>
              <Sparkles className="h-4 w-4 text-purple-600" />
              <button
                onClick={() => setShowDisplayModeDropdown(!showDisplayModeDropdown)}
                className="text-sm font-semibold flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded"
              >
                New AI chat <ChevronDown className="h-3 w-3" />
              </button>
              
              {/* Dropdown Menu */}
              {showDisplayModeDropdown && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => {
                      setDisplayMode('sidebar')
                      setShowDisplayModeDropdown(false)
                      onDisplayModeChange?.('sidebar')
                    }}
                    className="w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Sidebar className="h-4 w-4" />
                      <span>Sidebar</span>
                    </div>
                    {displayMode === 'sidebar' && <Check className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setDisplayMode('floating')
                      setShowDisplayModeDropdown(false)
                      onDisplayModeChange?.('floating')
                    }}
                    className="w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Move className="h-4 w-4" />
                      <span>Floating</span>
                    </div>
                    {displayMode === 'floating' && <Check className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                {isMinimized ? (
                  <Maximize2 className="h-4 w-4 text-gray-500" />
                ) : (
                  <Minus className="h-4 w-4 text-gray-500" />
                )}
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions - Only visible when closed */}
        {!isOpen && (
          <div className="flex items-center gap-2 mb-2 p-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5"
              >
                <action.icon className="h-3 w-3" />
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Chat Messages - Only visible when open */}
        {isOpen && !isMinimized && (
          <div className="flex-1 p-4 overflow-y-auto min-h-0">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <p className="text-sm">Start a conversation with AI</p>
                <p className="text-xs mt-1">Ask me to create content or edit your page</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-0 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-6 text-gray-900 dark:text-gray-100">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-5 text-gray-900 dark:text-gray-100">{children}</h3>,
                              h4: ({ children }) => <h4 className="text-base font-medium mb-2 mt-4 text-gray-800 dark:text-gray-200">{children}</h4>,
                              p: ({ children }) => <p className="text-sm mb-4 leading-relaxed text-gray-900 dark:text-gray-100 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc list-outside mb-4 ml-5 space-y-2 text-sm text-gray-900 dark:text-gray-100">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-outside mb-4 ml-5 space-y-2 text-sm text-gray-900 dark:text-gray-100">{children}</ol>,
                              li: ({ children }) => <li className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>,
                              em: ({ children }) => <em className="italic text-gray-800 dark:text-gray-200">{children}</em>,
                              code: ({ children }) => <code className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono text-gray-900 dark:text-gray-100">{children}</code>,
                              pre: ({ children }) => <pre className="bg-gray-200 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto mb-4 text-xs font-mono text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700">{children}</pre>,
                              blockquote: ({ children }) => <blockquote className="border-l-4 border-purple-400 dark:border-purple-600 pl-4 italic mb-4 text-gray-700 dark:text-gray-300 bg-purple-50 dark:bg-purple-900/10 py-2">{children}</blockquote>,
                              hr: () => <hr className="my-6 border-gray-300 dark:border-gray-600" />,
                              a: ({ children, href }) => <a href={href} className="text-purple-600 dark:text-purple-400 hover:underline">{children}</a>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                    {/* Draft to page button - REMOVED: LoopwellAI handles drafts through preview cards based on intent */}
                  </div>
                ))}
                
                {/* Pending Preview Card */}
                {pendingPreview && (
                  <div className="mt-4">
                    <AIPreviewCard
                      response={pendingPreview}
                      onConfirm={() => {
                        // Handle confirmation based on intent
                        if (pendingPreview.intent === 'create_new_page' || pendingPreview.intent === 'append_to_page') {
                          if (pendingPreview.preview?.markdown && onContentUpdate) {
                            const existingContent = currentContent || ''
                            const newContent = existingContent.trim() 
                              ? `${existingContent}\n\n${pendingPreview.preview.markdown}`
                              : pendingPreview.preview.markdown
                            onContentUpdate(newContent)
                          }
                          if (pendingPreview.preview?.title && onTitleUpdate) {
                            onTitleUpdate(pendingPreview.preview.title)
                          }
                        } else if (pendingPreview.intent === 'improve_existing_page') {
                          if (pendingPreview.preview?.markdown && onContentUpdate) {
                            onContentUpdate(pendingPreview.preview.markdown)
                          }
                        }
                        // TODO: Handle extract_tasks and tag_pages
                        setPendingPreview(null)
                      }}
                      onReject={() => {
                        setPendingPreview(null)
                      }}
                      onContentUpdate={onContentUpdate}
                      onTitleUpdate={onTitleUpdate}
                    />
                  </div>
                )}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-gray-500">Analyzing intent...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        )}

        {/* Input Section - Always visible */}
        <div className={cn(
          "p-4 border-t border-gray-200 dark:border-gray-700 shrink-0",
          !isOpen && "border-t-0 p-2"
        )}>
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask, search, or make anything..."
              className="flex-1 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="flex items-center gap-1">
              {!isOpen && (
                <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <Mic className="h-4 w-4 text-gray-500" />
                </button>
              )}
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                ) : (
                  <Send className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          {/* Quick Actions in Panel - Only when open */}
          {isOpen && !isMinimized && (
            <div className="flex items-center gap-2 mt-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Backdrop - Only when open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => {
            setIsOpen(false)
            onOpenChange?.(false)
          }}
        />
      )}
    </>
  )
}
