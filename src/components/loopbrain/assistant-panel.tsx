"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { AILogo } from "@/components/ai-logo"
import { 
  Send, 
  X, 
  Minus,
  Maximize2,
  Loader2,
  Plus,
  Move,
  Sidebar,
  Lightbulb,
  Languages,
  Search,
  CheckSquare
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { callLoopbrainAssistant } from "@/lib/loopbrain/client"
import { useLoopbrainAssistant } from "./assistant-context"
import type { LoopbrainResponse, LoopbrainSuggestion, LoopbrainMode } from "@/lib/loopbrain/orchestrator-types"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface LoopbrainAssistantPanelProps {
  /** Operating mode */
  mode: LoopbrainMode
  /** Context anchors (pageId, projectId, taskId, roleId, teamId) */
  anchors?: {
    pageId?: string
    projectId?: string
    taskId?: string
    roleId?: string
    teamId?: string
  }
  /** Whether panel is open (controlled) */
  open?: boolean
  /** Whether panel is open by default (uncontrolled) */
  defaultOpen?: boolean
  /** Callback when open state changes */
  onOpenChange?: (isOpen: boolean) => void
  /** Display mode (sidebar or floating) */
  displayMode?: 'sidebar' | 'floating'
  /** Callback when display mode changes */
  onDisplayModeChange?: (mode: 'sidebar' | 'floating') => void
}

export function LoopbrainAssistantPanel({
  mode,
  anchors = {},
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  displayMode: propDisplayMode,
  onDisplayModeChange
}: LoopbrainAssistantPanelProps) {
  // Use context for persistent state
  const { state, setIsOpen, setIsMinimized, setMessages, addMessage, clearMessages } = useLoopbrainAssistant()
  
  // Use controlled open if provided, otherwise use internal state
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const messages = state.messages
  const isMinimized = state.isMinimized
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [displayMode, setDisplayMode] = useState<'sidebar' | 'floating'>(propDisplayMode || 'floating')
  const [lastLoopbrainResponse, setLastLoopbrainResponse] = useState<LoopbrainResponse | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync prop display mode
  useEffect(() => {
    if (propDisplayMode) {
      setDisplayMode(propDisplayMode)
    }
  }, [propDisplayMode])

  const handleOpenChange = (open: boolean) => {
    if (controlledOpen === undefined) {
      // Only update internal state if not controlled
      setInternalOpen(open)
    }
    setIsOpen(open)
    onOpenChange?.(open)
  }

  const handleDisplayModeChange = (newMode: 'sidebar' | 'floating') => {
    setDisplayMode(newMode)
    onDisplayModeChange?.(newMode)
  }

  const handleNewChat = () => {
    clearMessages()
    setInput("")
    setLastLoopbrainResponse(null)
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    // Open panel when first message is sent
    if (!isOpen) {
      handleOpenChange(true)
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    addMessage(userMessage)
    const currentInput = input.trim()
    setInput("")
    setIsLoading(true)

    try {
      // Call Loopbrain assistant with mode and anchors
      const result = await callLoopbrainAssistant({
        mode,
        query: currentInput,
        pageId: anchors.pageId,
        projectId: anchors.projectId,
        taskId: anchors.taskId,
        roleId: anchors.roleId,
        teamId: anchors.teamId,
        useSemanticSearch: true,
        maxContextItems: 10
      })

      // Store response for suggestions/retrieved items
      setLastLoopbrainResponse(result)

      // Add assistant message with answer
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.answer || 'Sorry, I could not generate a response.',
        timestamp: new Date()
      }
      addMessage(assistantMessage)
    } catch (error) {
      console.error('Error calling Loopbrain:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Loopbrain couldn\'t answer right now. Please try again.',
        timestamp: new Date()
      }
      addMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div 
      className={cn(
        "fixed shadow-lg flex flex-col",
        "transition-all duration-500 ease-in-out z-50",
        isOpen 
          ? isMinimized
            ? "bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center cursor-pointer hover:shadow-xl bg-purple-600 hover:bg-purple-700 border-0"
            : "bg-card border border-border " + (displayMode === 'floating'
              ? "top-[50%] right-4 -translate-y-1/2 h-[600px] rounded-lg w-[500px]"
              : "right-0 top-0 h-full rounded-none w-full md:w-96")
          : "hidden"
      )}
      onClick={isOpen && isMinimized ? () => setIsMinimized(false) : undefined}
    >
      {/* Minimized Logo - Only visible when minimized */}
      {isOpen && isMinimized && (
        <AILogo 
          width={28} 
          height={28} 
          className="w-7 h-7"
          priority
        />
      )}

      {/* Header - Only visible when open and not minimized */}
      {isOpen && !isMinimized && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 bg-card">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">New AI chat</span>
            <button
              onClick={handleNewChat}
              className="p-1.5 hover:bg-muted rounded transition-colors"
              title="Start new chat"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            {/* Floating/Sidebar Toggle Button */}
            <button
              onClick={() => {
                const newMode = displayMode === 'sidebar' ? 'floating' : 'sidebar'
                handleDisplayModeChange(newMode)
              }}
              className="p-1.5 hover:bg-muted rounded transition-colors"
              title={displayMode === 'sidebar' ? 'Switch to floating' : 'Switch to sidebar'}
            >
              {displayMode === 'sidebar' ? (
                <Move className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Sidebar className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {/* Minimize Button */}
            <button 
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 hover:bg-muted rounded transition-colors"
              title={isMinimized ? 'Restore' : 'Minimize'}
            >
              {isMinimized ? (
                <Maximize2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {/* Close Button */}
            <button 
              onClick={() => {
                handleOpenChange(false)
              }}
              className="p-1.5 hover:bg-muted rounded transition-colors"
              title="Close"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Chat Messages - Only visible when open and not minimized */}
      {isOpen && !isMinimized && (
        <div className="flex-1 overflow-y-auto min-h-0 bg-background">
          {messages.length === 0 ? (
            <div className="flex flex-col items-start p-6 max-w-3xl mx-auto">
              {/* Large Loopwell Logo Avatar */}
              <div className="mb-6">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <AILogo 
                    width={40} 
                    height={40} 
                    className="w-10 h-10"
                  />
                </div>
              </div>
              
              {/* Greeting */}
              <h2 className="text-lg font-semibold text-foreground mb-6">
                How can I help you today?
              </h2>
              
              {/* Suggested Actions */}
              <div className="space-y-2 w-full">
                <button
                  onClick={() => {
                    setInput("Personalize your Loopwell AI")
                    inputRef.current?.focus()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <span className="text-sm text-foreground flex-1">Personalize your Loopwell AI</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500 text-white">New</span>
                </button>
                
                <button
                  onClick={() => {
                    setInput("Analyze for insights")
                    inputRef.current?.focus()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-foreground flex-1">Analyze for insights</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500 text-white">New</span>
                </button>
                
                <button
                  onClick={() => {
                    setInput("Create a task tracker")
                    inputRef.current?.focus()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-foreground flex-1">Create a task tracker</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500 text-white">New</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="space-y-6 max-w-3xl mx-auto">
                {messages.map((message, messageIndex) => {
                  // Check if this is the last assistant message and we have Loopbrain response
                  const isLastAssistantMessage = message.role === 'assistant' && 
                    messageIndex === messages.length - 1 &&
                    lastLoopbrainResponse !== null
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar for assistant messages */}
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <AILogo 
                            width={20} 
                            height={20} 
                            className="w-5 h-5"
                          />
                        </div>
                      )}
                      <div
                        className={`flex-1 rounded-lg px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        ) : (
                          <div className="space-y-4">
                            {/* Answer content */}
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-0 text-foreground border-b border-border pb-2">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-6 text-foreground">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-5 text-foreground">{children}</h3>,
                                  h4: ({ children }) => <h4 className="text-base font-medium mb-2 mt-4 text-foreground">{children}</h4>,
                                  p: ({ children }) => <p className="text-sm mb-4 leading-relaxed text-foreground last:mb-0">{children}</p>,
                                  ul: ({ children }) => <ul className="list-disc list-outside mb-4 ml-5 space-y-2 text-sm text-foreground">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal list-outside mb-4 ml-5 space-y-2 text-sm text-foreground">{children}</ol>,
                                  li: ({ children }) => <li className="text-sm text-foreground leading-relaxed">{children}</li>,
                                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                                  em: ({ children }) => <em className="italic text-foreground">{children}</em>,
                                  code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">{children}</code>,
                                  pre: ({ children }) => <pre className="bg-muted p-3 rounded-lg overflow-x-auto mb-4 text-xs font-mono text-foreground border border-border">{children}</pre>,
                                  blockquote: ({ children }) => <blockquote className="border-l-4 border-purple-400 dark:border-purple-600 pl-4 italic mb-4 text-foreground bg-purple-50 dark:bg-purple-900/10 py-2">{children}</blockquote>,
                                  hr: () => <hr className="my-6 border-border" />,
                                  a: ({ children, href }) => <a href={href} className="text-purple-600 dark:text-purple-400 hover:underline">{children}</a>,
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                            
                            {/* Loopbrain suggestions and retrieved items - only for last assistant message */}
                            {isLastAssistantMessage && lastLoopbrainResponse && (
                              <>
                                {/* Suggestions */}
                                {lastLoopbrainResponse.suggestions && lastLoopbrainResponse.suggestions.length > 0 && (
                                  <div className="mt-4 pt-4 border-t border-border">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Suggestions:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {lastLoopbrainResponse.suggestions.map((suggestion, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => {
                                            console.log('Loopbrain suggestion clicked', suggestion)
                                            // TODO: wire to action executor in a later step
                                          }}
                                          className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                        >
                                          {suggestion.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Retrieved items from semantic search */}
                                {lastLoopbrainResponse.context.retrievedItems && 
                                 lastLoopbrainResponse.context.retrievedItems.length > 0 && (
                                  <div className="mt-4 pt-4 border-t border-border">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Related items:</p>
                                    <div className="space-y-1">
                                      {lastLoopbrainResponse.context.retrievedItems.slice(0, 5).map((item, idx) => (
                                        <div
                                          key={idx}
                                          className="text-xs text-muted-foreground flex items-center justify-between"
                                        >
                                          <span className="truncate">{item.title}</span>
                                          {item.score !== undefined && (
                                            <span className="ml-2 text-xs text-muted-foreground/70">
                                              {item.score.toFixed(2)}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Analyzing intent...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input Section - Hidden only when minimized */}
      {!isMinimized && (
        <div className="p-4 border-t border-border shrink-0 bg-card">
          {/* Input Field */}
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask, search, or make anything..."
              className="flex-1 text-sm border border-border bg-background focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 rounded-md px-3 py-2"
            />
            
            {/* Send Button */}
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-2 hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              title="Send"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Send className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

