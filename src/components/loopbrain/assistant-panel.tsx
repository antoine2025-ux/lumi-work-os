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
  CheckSquare,
  ThumbsUp,
  ThumbsDown,
  ChevronsUp,
  ChevronsDown,
  Clock,
  Lock,
  Bell,
  CircleDot,
  AlertTriangle,
  ArrowRight,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { callLoopbrainAssistant } from "@/lib/loopbrain/client"
import { useLoopbrainAssistant } from "./assistant-context"
import type { LoopbrainResponse, LoopbrainSuggestion, LoopbrainMode } from "@/lib/loopbrain/orchestrator-types"
import type { AgentPlan, ClarifyingQuestion, ClarificationContext, AdvisoryContext, AdvisoryResponse } from "@/lib/loopbrain/agent/types"
import { PlanConfirmation } from "./plan-confirmation"
import { ClarifyingQuestions } from "./clarifying-questions"
import { ExecutionProgress } from "./execution-progress"
import { AdvisorySuggestion } from "./advisory-suggestion"
import { OrgRoutingBadge } from "@/components/debug/OrgRoutingBadge"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface LoopbrainAssistantPanelProps {
  /** Operating mode */
  mode: LoopbrainMode
  /** Context anchors (pageId, projectId, taskId, roleId, teamId, personId) */
  anchors?: {
    pageId?: string
    projectId?: string
    taskId?: string
    roleId?: string
    teamId?: string
    personId?: string
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
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, string>>({}) // messageId -> rating|signal
  const [topInsights, setTopInsights] = useState<Array<{ id: string; title: string; priority: string; category: string; recommendations: Array<{ action: string; deepLink?: string }> }>>([])
  const [pendingPlan, setPendingPlan] = useState<AgentPlan | null>(null)
  const [isExecutingPlan, setIsExecutingPlan] = useState(false)
  const [executingPlan, setExecutingPlan] = useState<AgentPlan | null>(null)
  const [executionResult, setExecutionResult] = useState<string | null>(null)
  const [pendingClarification, setPendingClarification] = useState(false)
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarifyingQuestion[] | null>(null)
  const [clarifyPreamble, setClarifyPreamble] = useState<string>('')
  const [clarificationContext, setClarificationContext] = useState<ClarificationContext | null>(null)
  const [plannerInsights, setPlannerInsights] = useState<string[]>([])
  const [advisoryContext, setAdvisoryContext] = useState<AdvisoryContext | null>(null)
  const [advisoryResponse, setAdvisoryResponse] = useState<AdvisoryResponse | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Send feedback to the API and track locally
  const handleFeedback = async (messageId: string, rating: "up" | "down", signal?: "too_long" | "too_short") => {
    const key = signal ? `${rating}_${signal}` : rating
    setFeedbackGiven((prev) => ({ ...prev, [messageId]: key }))
    try {
      await fetch("/api/loopbrain/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, rating, signal }),
      })
    } catch (err) {
      console.error("Failed to send feedback", err)
    }
  }

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
    setPendingPlan(null)
    setIsExecutingPlan(false)
    setExecutingPlan(null)
    setExecutionResult(null)
    setPendingClarification(false)
    setClarifyingQuestions(null)
    setClarifyPreamble('')
    setClarificationContext(null)
    setPlannerInsights([])
    setAdvisoryContext(null)
    setAdvisoryResponse(null)
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handlePlanConfirm = async () => {
    if (!pendingPlan || isExecutingPlan) return

    // Immediately show progress UI with animated steps
    const planToExecute = pendingPlan
    setExecutingPlan(planToExecute)
    setExecutionResult(null)
    setIsExecutingPlan(true)
    setPendingPlan(null)

    try {
      const result = await callLoopbrainAssistant({
        mode,
        query: "yes",
        pageId: anchors.pageId,
        projectId: anchors.projectId,
        taskId: anchors.taskId,
        roleId: anchors.roleId,
        teamId: anchors.teamId,
        personId: anchors.personId,
        pendingPlan: planToExecute,
      })

      setLastLoopbrainResponse(result)
      setExecutionResult(result.answer || 'Done.')
      setPendingPlan(result.pendingPlan ?? null)
    } catch (error) {
      console.error('Error executing plan:', error)
      setExecutionResult(
        error instanceof Error ? `\u2717 ${error.message}` : '\u2717 Plan execution failed. Please try again.'
      )
    } finally {
      setIsExecutingPlan(false)
      setClarificationContext(null)
      setAdvisoryContext(null)
      setAdvisoryResponse(null)
    }
  }

  const handlePlanCancel = () => {
    setPendingPlan(null)
    setExecutingPlan(null)
    setExecutionResult(null)
    setClarificationContext(null)
    setAdvisoryContext(null)
    setAdvisoryResponse(null)
    const cancelMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Plan cancelled.',
      timestamp: new Date(),
    }
    addMessage(cancelMessage)
  }

  /** Build conversationContext from recent messages for clarification follow-ups */
  const buildConversationContext = (): string => {
    const recent = messages.slice(-6) // last 3 turns (user+assistant pairs)
    if (recent.length === 0) return ''
    return recent.map((m) => `${m.role}: ${m.content}`).join('\n')
  }

  /** Handle user submitting answers to clarifying questions */
  const handleClarifySubmit = async (answersText: string) => {
    setPendingClarification(false)
    setClarifyingQuestions(null)
    setClarifyPreamble('')

    // Add user's answers as a message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: answersText,
      timestamp: new Date(),
    }
    addMessage(userMessage)
    setIsLoading(true)

    try {
      const storedClarification = clarificationContext
      const result = await callLoopbrainAssistant({
        mode,
        query: answersText,
        pageId: anchors.pageId,
        projectId: anchors.projectId,
        taskId: anchors.taskId,
        roleId: anchors.roleId,
        teamId: anchors.teamId,
        personId: anchors.personId,
        pendingClarification: storedClarification ?? undefined,
        conversationContext: buildConversationContext(),
      })

      setLastLoopbrainResponse(result)
      setPendingPlan(result.pendingPlan ?? null)
      setPendingClarification(result.pendingClarification ?? false)
      setClarifyingQuestions(result.clarifyingQuestions ?? null)
      setClarificationContext(result.clarificationContext ?? null)
      setAdvisoryContext(result.advisoryContext ?? null)
      setAdvisoryResponse(result.advisory ?? null)
      setPlannerInsights(result.insights ?? [])

      // Extract preamble from the answer if there are new clarifying questions
      if (result.pendingClarification && result.clarifyingQuestions) {
        // The preamble is embedded in the markdown answer — extract the first line
        const firstLine = result.answer.split('\n')[0]
        setClarifyPreamble(firstLine || 'A few more questions:')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.answer || 'Got it.',
        timestamp: new Date(),
      }
      addMessage(assistantMessage)
    } catch (error) {
      console.error('Error after clarification:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        timestamp: new Date(),
      }
      addMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  /** Handle user skipping clarifying questions */
  const handleClarifySkip = () => {
    handleClarifySubmit('just do it with defaults')
  }

  /** Handle user approving an advisory suggestion → convert to execution */
  const handleAdvisoryApprove = async () => {
    if (!advisoryContext) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: 'Set it up',
      timestamp: new Date(),
    }
    addMessage(userMessage)
    setIsLoading(true)

    const storedAdvisory = advisoryContext
    setAdvisoryResponse(null)

    try {
      const result = await callLoopbrainAssistant({
        mode,
        query: 'set it up',
        pageId: anchors.pageId,
        projectId: anchors.projectId,
        taskId: anchors.taskId,
        roleId: anchors.roleId,
        teamId: anchors.teamId,
        personId: anchors.personId,
        pendingAdvisory: storedAdvisory,
        conversationContext: buildConversationContext(),
      })

      setLastLoopbrainResponse(result)
      setPendingPlan(result.pendingPlan ?? null)
      setPendingClarification(result.pendingClarification ?? false)
      setClarifyingQuestions(result.clarifyingQuestions ?? null)
      setClarificationContext(result.clarificationContext ?? null)
      setAdvisoryContext(result.advisoryContext ?? null)
      setAdvisoryResponse(result.advisory ?? null)
      setPlannerInsights(result.insights ?? [])

      if (result.pendingClarification && result.clarifyingQuestions) {
        const firstLine = result.answer.split('\n')[0]
        setClarifyPreamble(firstLine || 'A few quick questions:')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.answer || 'Got it.',
        timestamp: new Date(),
      }
      addMessage(assistantMessage)
    } catch (error) {
      console.error('Error approving advisory:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        timestamp: new Date(),
      }
      addMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  /** Handle user wanting to refine an advisory suggestion */
  const handleAdvisoryRefine = () => {
    // Focus the input so the user can type their refinement
    // The advisory context stays in state, so when they send a message
    // it will be routed back to the planner with the advisory context
    inputRef.current?.focus()
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

  // Fetch top insights for the empty state
  useEffect(() => {
    if (isOpen && messages.length === 0 && topInsights.length === 0) {
      fetch("/api/loopbrain/insights?status=ACTIVE&limit=3")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.insights) {
            setTopInsights(
              data.insights.slice(0, 3).map((i: Record<string, unknown>) => ({
                id: i.id as string,
                title: i.title as string,
                priority: i.priority as string,
                category: i.category as string,
                recommendations: (i.recommendations as Array<{ action: string; deepLink?: string }>) || [],
              }))
            )
          }
        })
        .catch(() => {
          // Silent fail — insights are optional
        })
    }
  }, [isOpen, messages.length, topInsights.length])

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

    // Clear execution progress from previous turn
    setExecutingPlan(null)
    setExecutionResult(null)

    try {
      // If clarification is pending, attach context so orchestrator routes to planner
      const activeClarification = pendingClarification ? clarificationContext : null
      if (activeClarification) {
        setPendingClarification(false)
        setClarifyingQuestions(null)
        setClarifyPreamble('')
      }

      // If advisory is pending, attach context so orchestrator routes refinement
      const activeAdvisory = advisoryContext
      if (activeAdvisory) {
        setAdvisoryResponse(null)
      }

      // Call Loopbrain assistant with mode, anchors, and conversation context
      const convContext = buildConversationContext()
      const result = await callLoopbrainAssistant({
        mode,
        query: currentInput,
        pageId: anchors.pageId,
        projectId: anchors.projectId,
        taskId: anchors.taskId,
        roleId: anchors.roleId,
        teamId: anchors.teamId,
        personId: anchors.personId,
        useSemanticSearch: true,
        maxContextItems: 10,
        ...(convContext && { conversationContext: convContext }),
        ...(activeClarification && { pendingClarification: activeClarification }),
        ...(activeAdvisory && { pendingAdvisory: activeAdvisory }),
      })

      // Store response for suggestions/retrieved items
      setLastLoopbrainResponse(result)
      setPendingPlan(result.pendingPlan ?? null)
      setPendingClarification(result.pendingClarification ?? false)
      setClarifyingQuestions(result.clarifyingQuestions ?? null)
      setClarificationContext(result.clarificationContext ?? null)
      setAdvisoryContext(result.advisoryContext ?? null)
      setAdvisoryResponse(result.advisory ?? null)
      setPlannerInsights(result.insights ?? [])

      // Extract preamble from the answer if there are clarifying questions
      if (result.pendingClarification && result.clarifyingQuestions) {
        const firstLine = result.answer.split('\n')[0]
        setClarifyPreamble(firstLine || 'A few quick questions:')
      }

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
        <div className="flex-1 overflow-y-auto min-h-0 bg-background relative">
        {/* Org Routing Debug Badge - Only visible in dev mode */}
        {lastLoopbrainResponse?.metadata?.routing && (
          <OrgRoutingBadge
            contextType={(lastLoopbrainResponse.metadata.routing as any)?.contextType || 'unknown'}
            confidence={(lastLoopbrainResponse.metadata.routing as any)?.confidence || 0}
            itemCount={lastLoopbrainResponse.metadata.retrievedCount || 0}
            usedFallback={(lastLoopbrainResponse.metadata.routing as any)?.usedFallback || false}
            enabled={process.env.NODE_ENV !== "production"}
          />
        )}
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

              {/* Proactive Insights */}
              {topInsights.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" />
                    Active Insights
                  </p>
                  <div className="space-y-1.5">
                    {topInsights.map((insight) => {
                      const topRec = insight.recommendations[0]
                      return (
                        <button
                          key={insight.id}
                          onClick={() => {
                            if (topRec?.deepLink) {
                              window.location.href = topRec.deepLink
                            } else {
                              setInput(`Tell me about: ${insight.title}`)
                              inputRef.current?.focus()
                            }
                          }}
                          className="w-full flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                        >
                          <span className={cn(
                            "mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0",
                            insight.priority === "CRITICAL" || insight.priority === "HIGH"
                              ? "bg-red-500"
                              : insight.priority === "MEDIUM"
                                ? "bg-yellow-500"
                                : "bg-blue-500"
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{insight.title}</p>
                            {topRec && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                                {topRec.action}
                                <ArrowRight className="h-2.5 w-2.5" />
                              </p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
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

                            {/* Feedback actions */}
                            <div className="flex items-center gap-1 pt-1">
                              {(() => {
                                const fb = feedbackGiven[message.id]
                                return (
                                  <>
                                    <button
                                      onClick={() => handleFeedback(message.id, "up")}
                                      className={cn(
                                        "p-1 rounded hover:bg-background transition-colors",
                                        fb === "up" ? "text-green-600 dark:text-green-400" : "text-muted-foreground/50 hover:text-muted-foreground"
                                      )}
                                      title="Good response"
                                      disabled={!!fb}
                                    >
                                      <ThumbsUp className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleFeedback(message.id, "down")}
                                      className={cn(
                                        "p-1 rounded hover:bg-background transition-colors",
                                        fb === "down" ? "text-red-600 dark:text-red-400" : "text-muted-foreground/50 hover:text-muted-foreground"
                                      )}
                                      title="Bad response"
                                      disabled={!!fb}
                                    >
                                      <ThumbsDown className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="w-px h-3.5 bg-border mx-1" />
                                    <button
                                      onClick={() => handleFeedback(message.id, "down", "too_long")}
                                      className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                                        fb === "down_too_long"
                                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                          : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-background"
                                      )}
                                      title="Response was too long"
                                      disabled={!!fb}
                                    >
                                      <span className="flex items-center gap-0.5"><ChevronsDown className="h-3 w-3" />Too long</span>
                                    </button>
                                    <button
                                      onClick={() => handleFeedback(message.id, "down", "too_short")}
                                      className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                                        fb === "down_too_short"
                                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                          : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-background"
                                      )}
                                      title="Response was too short"
                                      disabled={!!fb}
                                    >
                                      <span className="flex items-center gap-0.5"><ChevronsUp className="h-3 w-3" />Too short</span>
                                    </button>
                                  </>
                                )
                              })()}
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

                                {/* Open Loops (World Model v0) */}
                                {lastLoopbrainResponse.openLoops && lastLoopbrainResponse.openLoops.length > 0 && (
                                  <div className="mt-4 pt-4 border-t border-border">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Open loops:</p>
                                    <div className="space-y-1.5">
                                      {lastLoopbrainResponse.openLoops.map((loop) => {
                                        const LoopIcon = loop.type === "OVERDUE" ? Clock
                                          : loop.type === "BLOCKED" ? Lock
                                          : loop.type === "NEEDS_RESPONSE" ? Bell
                                          : CircleDot
                                        return (
                                          <div
                                            key={loop.id}
                                            className="flex items-start gap-2 text-xs text-muted-foreground"
                                          >
                                            <LoopIcon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                            <div className="min-w-0">
                                              <span className="font-medium text-foreground truncate block">{loop.title}</span>
                                              {loop.detail && (
                                                <span className="text-muted-foreground/70">{loop.detail}</span>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Clarifying Questions Card */}
                                {pendingClarification && clarifyingQuestions && (
                                  <ClarifyingQuestions
                                    preamble={clarifyPreamble}
                                    questions={clarifyingQuestions}
                                    onSubmit={handleClarifySubmit}
                                    onSkip={handleClarifySkip}
                                    insights={plannerInsights.length > 0 ? plannerInsights : undefined}
                                  />
                                )}

                                {/* Advisory Suggestion Card */}
                                {advisoryResponse && advisoryContext && (
                                  <AdvisorySuggestion
                                    advisory={advisoryResponse}
                                    onApprove={handleAdvisoryApprove}
                                    onRefine={handleAdvisoryRefine}
                                    insights={plannerInsights.length > 0 ? plannerInsights : undefined}
                                  />
                                )}

                                {/* Plan Confirmation Card */}
                                {pendingPlan && !executingPlan && (
                                  <PlanConfirmation
                                    plan={pendingPlan}
                                    onConfirm={handlePlanConfirm}
                                    onCancel={handlePlanCancel}
                                    isExecuting={isExecutingPlan}
                                    insights={plannerInsights.length > 0 ? plannerInsights : undefined}
                                  />
                                )}

                                {/* Execution Progress */}
                                {executingPlan && (
                                  <ExecutionProgress
                                    plan={executingPlan}
                                    isExecuting={isExecutingPlan}
                                    executionResult={executionResult ?? undefined}
                                  />
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
              placeholder={pendingPlan ? "Confirm or cancel the plan above..." : pendingClarification ? "Answer the questions above, or type here..." : advisoryResponse ? "Refine the suggestion or approve it above..." : "Ask, search, or make anything..."}
              disabled={!!pendingPlan}
              className="flex-1 text-sm border border-border bg-background focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 rounded-md px-3 py-2"
            />
            
            {/* Send Button */}
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !!pendingPlan}
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

