"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
  Search,
  CheckSquare,
  Check,
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
import { callLoopbrainAssistant, executeLoopbrainPlanStream } from "@/lib/loopbrain/client"
import { LoopbrainMarkdown } from "./loopbrain-markdown"
import { useLoopbrainAssistant } from "./assistant-context"
import type { LoopbrainResponse, LoopbrainMode, MeetingTaskExtractionResult, OnboardingBriefing, DailyBriefing, MeetingPrepBrief as MeetingPrepBriefType, LoopbrainClientAction } from "@/lib/loopbrain/orchestrator-types"
import type { AgentPlan, ClarifyingQuestion, ClarificationContext, AdvisoryContext, AdvisoryResponse } from "@/lib/loopbrain/agent/types"
import { PlanConfirmation } from "./plan-confirmation"
import { MeetingTaskReview } from "./MeetingTaskReview"
import { OnboardingBriefing as OnboardingBriefingView } from "./OnboardingBriefing"
import { MeetingPrepBrief as MeetingPrepBriefView } from "./MeetingPrepBrief"
import { ClarifyingQuestions } from "./clarifying-questions"
import { ExecutionProgress, type StepProgressState } from "./execution-progress"
import { ExecutionPlanView, type ExecutionPlanStep } from "./execution-plan-view"
import { formatPlanForDisplay } from "./format-plan-steps"
import { AdvisorySuggestion } from "./advisory-suggestion"
import { OrgRoutingBadge } from "@/components/debug/OrgRoutingBadge"
import { useWorkspace } from "@/lib/workspace-context"

const CONVERSATION_ID_KEY = 'loopbrain-conversation-id'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const THINKING_STEPS = [
  { text: 'Analyzing your request...', duration: 2000 },
  { text: 'Gathering workspace context...', duration: 2500 },
  { text: 'Reasoning about the best approach...', duration: 3000 },
  { text: 'Building response...', duration: 4000 },
  { text: 'Almost there...', duration: 5000 },
]

function ThinkingIndicator() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  useEffect(() => {
    const step = THINKING_STEPS[currentStepIndex]
    const timer = setTimeout(() => {
      setCurrentStepIndex((prev) => (prev + 1) % THINKING_STEPS.length)
    }, step.duration)

    return () => clearTimeout(timer)
  }, [currentStepIndex])

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex h-4 w-4">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-500" />
      </div>
      <span className="text-sm text-muted-foreground transition-opacity duration-300">
        {THINKING_STEPS[currentStepIndex].text}
      </span>
    </div>
  )
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
  /** Display mode (sidebar, floating, or dashboard-sidebar) */
  displayMode?: 'sidebar' | 'floating' | 'dashboard-sidebar'
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
  const router = useRouter()

  // Use context for persistent state
  const { state, setIsOpen, setIsMinimized, addMessage, clearMessages, pendingQuery, setPendingQuery } = useLoopbrainAssistant()
  const { currentWorkspace } = useWorkspace()

  // Use controlled open if provided, otherwise use internal state
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const messages = state.messages
  const isMinimized = state.isMinimized
  const [input, setInput] = useState("")

  // Consume pendingQuery — pre-fill input when a starter prompt is queued
  useEffect(() => {
    if (pendingQuery && isOpen) {
      setInput(pendingQuery)
      setPendingQuery(null)
      // Focus the input after a short delay so it's ready to edit or submit
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [pendingQuery, isOpen, setPendingQuery])
  const [isLoading, setIsLoading] = useState(false)
  const [displayMode, setDisplayMode] = useState<'sidebar' | 'floating' | 'dashboard-sidebar'>(propDisplayMode || 'floating')
  const [lastLoopbrainResponse, setLastLoopbrainResponse] = useState<LoopbrainResponse | null>(null)
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, string>>({}) // messageId -> rating|signal
  const [topInsights, setTopInsights] = useState<Array<{ id: string; title: string; priority: string; category: string; recommendations: Array<{ action: string; deepLink?: string }> }>>([])
  const [pendingPlan, setPendingPlan] = useState<AgentPlan | null>(null)
  const [isExecutingPlan, setIsExecutingPlan] = useState(false)
  const [executingPlan, setExecutingPlan] = useState<AgentPlan | null>(null)
  const [executionResult, setExecutionResult] = useState<string | null>(null)
  const [stepProgress, setStepProgress] = useState<StepProgressState[]>([])
  const [executionError, setExecutionError] = useState<string | null>(null)
  const [pendingClarification, setPendingClarification] = useState(false)
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarifyingQuestion[] | null>(null)
  const [clarifyPreamble, setClarifyPreamble] = useState<string>('')
  const [clarificationContext, setClarificationContext] = useState<ClarificationContext | null>(null)
  const [plannerInsights, setPlannerInsights] = useState<string[]>([])
  const [advisoryContext, setAdvisoryContext] = useState<AdvisoryContext | null>(null)
  const [advisoryResponse, setAdvisoryResponse] = useState<AdvisoryResponse | null>(null)
  const [meetingExtraction, setMeetingExtraction] = useState<MeetingTaskExtractionResult | null>(null)
  const [onboardingBriefing, setOnboardingBriefing] = useState<OnboardingBriefing | null>(null)
  const [dailyBriefing, setDailyBriefing] = useState<DailyBriefing | null>(null)
  const [meetingPrepBrief, setMeetingPrepBrief] = useState<MeetingPrepBriefType | null>(null)
  const [isCreatingMeetingTasks, setIsCreatingMeetingTasks] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(CONVERSATION_ID_KEY)
    }
    return null
  })
  const [pendingClientAction, setPendingClientAction] = useState<LoopbrainClientAction | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Track previous workspace to detect workspace switches (undefined = not yet initialized)
  const prevWorkspaceIdRef = useRef<string | null | undefined>(undefined)

  // Sync conversationId to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (conversationId) {
        sessionStorage.setItem(CONVERSATION_ID_KEY, conversationId)
      } else {
        sessionStorage.removeItem(CONVERSATION_ID_KEY)
      }
    }
  }, [conversationId])

  // Execute a client action after a 500ms delay so the user sees the message first
  const executeClientAction = useCallback((action: LoopbrainClientAction) => {
    setTimeout(() => {
      if (action.type === 'navigate') {
        router.push(action.url)
      } else {
        window.location.href = action.url
      }
      setPendingClientAction(null)
    }, 500)
  }, [router])

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
    } catch (err: unknown) {
      console.error("Failed to send feedback", err)
    }
  }

  // Transform pendingPlan or executingPlan into display format
  const displayPlan = useMemo(() => {
    const plan = executingPlan || pendingPlan
    console.log('[PlanView] pendingPlan exists:', !!pendingPlan, 'has steps:', pendingPlan?.steps?.length)
    console.log('[PlanView] executingPlan exists:', !!executingPlan, 'has steps:', executingPlan?.steps?.length)
    
    if (!plan || !plan.steps || plan.steps.length === 0) {
      console.log('[PlanView] Early return - no plan or no steps')
      return null
    }
    
    console.log('[PlanView] Plan steps:', plan.steps.map(s => ({ toolName: s.toolName, stepNumber: s.stepNumber })))
    
    try {
      const result = formatPlanForDisplay(plan, isExecutingPlan ? stepProgress : undefined)
      console.log('[PlanView] displayPlan result - title:', result?.title, 'steps count:', result?.steps?.length)
      return result
    } catch (error) {
      console.error('[PlanView] Failed to format plan for display:', error)
      return null
    }
  }, [pendingPlan, executingPlan, stepProgress, isExecutingPlan])

  // Map real-time step progress to display format
  const getDisplayStepsWithStatus = useCallback(() => {
    if (!displayPlan) return []
    
    return displayPlan.steps.map((step, stepIndex) => {
      // For parent steps, check if any children are executing/success/error
      if (step.children && step.children.length > 0) {
        const childStatuses = step.children.map((_, childIdx) => {
          const progressIdx = stepIndex + childIdx + 1 // approximate mapping
          return stepProgress[progressIdx]?.status || 'pending'
        })
        
        // Parent status: executing if any child executing, success if all success, error if any error
        let parentStatus: ExecutionPlanStep['status'] = 'pending'
        if (childStatuses.some(s => s === 'error')) parentStatus = 'error'
        else if (childStatuses.every(s => s === 'success')) parentStatus = 'success'
        else if (childStatuses.some(s => s === 'executing')) parentStatus = 'executing'
        
        return {
          ...step,
          status: isExecutingPlan ? parentStatus : 'pending',
          children: step.children.map((child, childIdx) => ({
            ...child,
            status: isExecutingPlan 
              ? (stepProgress[stepIndex + childIdx + 1]?.status || 'pending')
              : 'pending'
          }))
        }
      }
      
      // Leaf steps: direct mapping
      return {
        ...step,
        status: isExecutingPlan 
          ? (stepProgress[stepIndex]?.status || 'pending')
          : 'pending'
      }
    })
  }, [displayPlan, stepProgress, isExecutingPlan])

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
    setStepProgress([])
    setExecutionError(null)
    setPendingClarification(false)
    setClarifyingQuestions(null)
    setClarifyPreamble('')
    setClarificationContext(null)
    setPlannerInsights([])
    setAdvisoryContext(null)
    setAdvisoryResponse(null)
    setMeetingExtraction(null)
    setIsCreatingMeetingTasks(false)
    setConversationId(null)
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  // Reset conversation when the user switches workspaces so stale cross-workspace
  // messages are never visible. We skip the initial render (undefined sentinel).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const wsId = currentWorkspace?.id ?? null
    if (prevWorkspaceIdRef.current === undefined) {
      prevWorkspaceIdRef.current = wsId
      return
    }
    if (prevWorkspaceIdRef.current !== wsId) {
      prevWorkspaceIdRef.current = wsId
      handleNewChat()
    }
  }, [currentWorkspace?.id])

  const handlePlanConfirm = async (planOverride?: AgentPlan | null) => {
    const planToUse = planOverride ?? pendingPlan
    if (!planToUse || isExecutingPlan) return

    const planToExecute = planToUse
    setExecutingPlan(planToExecute)
    setExecutionResult(null)
    setExecutionError(null)
    setStepProgress(
      (planToExecute.steps ?? []).map((s) => ({
        description: s.description,
        status: 'pending' as const,
      }))
    )
    setIsExecutingPlan(true)
    setPendingPlan(null)

    const convId = conversationId ?? crypto.randomUUID()
    if (!conversationId) setConversationId(convId)

    try {
      await executeLoopbrainPlanStream(
        { conversationId: convId },
        {
          onProgress: (event) => {
            if (
              event.type === 'progress' &&
              typeof event.stepIndex === 'number' &&
              event.stepIndex >= 0
            ) {
              const idx = event.stepIndex
              setStepProgress((prev) => {
                const next = [...prev]
                if (event.description) {
                  next[idx] = {
                    description: event.description,
                    status: event.status ?? 'pending',
                    error: event.error,
                  }
                }
                return next
              })
            }
          },
          onComplete: (summary, clientAction) => {
            setExecutionResult(summary)
            setExecutionError(null)
            // Handle client action (e.g. redirect to newly created wiki page)
            if (clientAction) {
              setPendingClientAction(clientAction)
              executeClientAction(clientAction)
            }
          },
          onError: (err) => {
            setExecutionError(err)
          },
        }
      )
    } catch (error: unknown) {
      console.error('Error executing plan:', error)
      const msg =
        error instanceof Error ? error.message : 'Plan execution failed. Please try again.'
      setExecutionError(msg)
    } finally {
      setIsExecutingPlan(false)
      setClarificationContext(null)
      setAdvisoryContext(null)
      setAdvisoryResponse(null)
    }
  }

  const handleExecutionRetry = () => {
    if (!executingPlan) return
    setExecutionError(null)
    setStepProgress([])
    setExecutionResult(null)
    handlePlanConfirm(executingPlan)
  }

  const handleExecutionCancel = () => {
    setExecutionError(null)
    setStepProgress([])
    setExecutingPlan(null)
    setExecutionResult(null)
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
        ...(conversationId && { conversationId }),
      })

      // Store response for suggestions/retrieved items
      setLastLoopbrainResponse(result)
      if (result.conversationId) setConversationId(result.conversationId)
      setPendingPlan(result.pendingPlan ?? null)
      setPendingClarification(result.pendingClarification ?? false)
      setClarifyingQuestions(result.clarifyingQuestions ?? null)
      setClarificationContext(result.clarificationContext ?? null)
      setAdvisoryContext(result.advisoryContext ?? null)
      setAdvisoryResponse(result.advisory ?? null)
      setPlannerInsights(result.insights ?? [])

      // Meeting task extraction — show review UI
      if (result.meetingExtraction) {
        setMeetingExtraction(result.meetingExtraction)
      }

      // Onboarding briefing — show inline briefing card
      if (result.onboardingBriefing) {
        setOnboardingBriefing(result.onboardingBriefing)
      }

      // Daily briefing — show inline briefing
      if (result.dailyBriefing) {
        setDailyBriefing(result.dailyBriefing)
      }

      // Meeting prep — show inline prep brief
      if (result.meetingPrep) {
        setMeetingPrepBrief(result.meetingPrep)
      }

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

      // Handle client action (navigation) after rendering the response
      if (result.clientAction) {
        setPendingClientAction(result.clientAction)
        executeClientAction(result.clientAction)
      }
    } catch (error: unknown) {
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

  const isDashboardSidebar = displayMode === 'dashboard-sidebar'

  // In dashboard-sidebar mode, hide entirely when not open
  if (isDashboardSidebar && !isOpen) return null

  return (
    <aside
      className={cn(
        "fixed flex flex-col z-50",
        isDashboardSidebar
          ? cn(
              "right-0 top-14 bottom-0 w-[320px] bg-card border-l border-border",
              "transition-transform duration-300 ease-in-out",
              !isMinimized ? "translate-x-0" : "translate-x-full"
            )
          : cn(
              "shadow-lg transition-all duration-500 ease-in-out",
              isOpen
                ? isMinimized
                  ? "bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center cursor-pointer hover:shadow-xl bg-purple-600 hover:bg-purple-700 border-0"
                  : "bg-card border border-border " + (displayMode === 'floating'
                    ? "top-[50%] right-4 -translate-y-1/2 h-[600px] rounded-lg w-[500px]"
                    : "right-0 top-0 h-full rounded-none w-full md:w-96")
                : "hidden"
            )
      )}
      onClick={isOpen && isMinimized && !isDashboardSidebar ? () => setIsMinimized(false) : undefined}
    >
      {/* Minimized Logo - Only visible when minimized (floating/sidebar modes only) */}
      {isOpen && isMinimized && !isDashboardSidebar && (
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
            {isDashboardSidebar ? (
              <>
                <AILogo width={24} height={24} className="w-6 h-6" />
                <span className="text-sm font-semibold text-foreground">Loopbrain</span>
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" aria-hidden />
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-foreground">New AI chat</span>
                <button
                  onClick={handleNewChat}
                  className="p-1.5 hover:bg-muted rounded transition-colors"
                  title="Start new chat"
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Floating/Sidebar Toggle - hidden in dashboard-sidebar */}
            {!isDashboardSidebar && (
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
            )}
            {/* New chat - only in dashboard-sidebar (floating/sidebar have it in header start) */}
            {isDashboardSidebar && (
              <button
                onClick={handleNewChat}
                className="p-1.5 hover:bg-muted rounded transition-colors"
                title="Start new chat"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
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
            {/* Close Button - closes panel (user re-opens via Quick Actions) */}
            <button 
              onClick={() => handleOpenChange(false)}
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
            contextType={lastLoopbrainResponse.metadata.routing?.contextType || 'unknown'}
            confidence={lastLoopbrainResponse.metadata.routing?.confidence || 0}
            itemCount={lastLoopbrainResponse.metadata.retrievedCount || 0}
            usedFallback={lastLoopbrainResponse.metadata.routing?.usedFallback || false}
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
                            <LoopbrainMarkdown content={message.content} size="sm" />

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
                                            // TODO [P1]: Wire to /api/loopbrain/actions endpoint (executor is implemented)
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

                                {/* Execution Plan View — unified pre-execution and during-execution */}
                                {(() => {
                                  console.log('[PlanView Render] displayPlan:', displayPlan)
                                  console.log('[PlanView Render] displayPlan?.steps.length:', displayPlan?.steps.length)
                                  console.log('[PlanView Render] pendingPlan:', !!pendingPlan)
                                  console.log('[PlanView Render] executingPlan:', !!executingPlan)
                                  console.log('[PlanView Render] condition result:', displayPlan && displayPlan.steps.length > 0 && (pendingPlan || executingPlan))
                                  return null
                                })()}
                                {displayPlan && displayPlan.steps.length > 0 && (pendingPlan || executingPlan) ? (
                                  <ExecutionPlanView
                                    plan={{
                                      ...displayPlan,
                                      steps: getDisplayStepsWithStatus()
                                    }}
                                    onConfirm={handlePlanConfirm}
                                    onModify={pendingPlan ? handlePlanCancel : undefined}
                                    isExecuting={isExecutingPlan}
                                  />
                                ) : (
                                  /* Fallback: if formatPlanForDisplay fails or returns empty, show old component */
                                  pendingPlan && !executingPlan && (
                                    <PlanConfirmation
                                      plan={pendingPlan}
                                      onConfirm={handlePlanConfirm}
                                      onCancel={handlePlanCancel}
                                      isExecuting={isExecutingPlan}
                                      insights={plannerInsights.length > 0 ? plannerInsights : undefined}
                                    />
                                  )
                                )}

                                {/* Meeting Task Review */}
                                {meetingExtraction && (
                                  <MeetingTaskReview
                                    extraction={meetingExtraction}
                                    isCreating={isCreatingMeetingTasks}
                                    onCancel={() => setMeetingExtraction(null)}
                                    onConfirm={async (selectedTasks) => {
                                      setIsCreatingMeetingTasks(true)
                                      try {
                                        const result = await callLoopbrainAssistant({
                                          mode,
                                          query: 'Confirm task creation',
                                          pageId: anchors.pageId,
                                          projectId: anchors.projectId,
                                          pendingMeetingExtraction: { tasks: selectedTasks },
                                        })
                                        const successMsg: Message = {
                                          id: (Date.now() + 1).toString(),
                                          role: 'assistant',
                                          content: result.answer || 'Tasks created.',
                                          timestamp: new Date(),
                                        }
                                        addMessage(successMsg)
                                      } catch (err: unknown) {
                                        console.error('Meeting task creation failed', err)
                                        const errMsg: Message = {
                                          id: (Date.now() + 1).toString(),
                                          role: 'assistant',
                                          content: 'Failed to create tasks. Please try again.',
                                          timestamp: new Date(),
                                        }
                                        addMessage(errMsg)
                                      } finally {
                                        setMeetingExtraction(null)
                                        setIsCreatingMeetingTasks(false)
                                      }
                                    }}
                                  />
                                )}

                                {/* Onboarding Briefing */}
                                {onboardingBriefing && (
                                  <OnboardingBriefingView
                                    briefing={onboardingBriefing}
                                    onDismiss={() => setOnboardingBriefing(null)}
                                    className="mt-2"
                                  />
                                )}

                                {/* Daily Briefing */}
                                {dailyBriefing && (
                                  <div className="mt-2 space-y-2">
                                    {dailyBriefing.sections.map((section, idx) => (
                                      <div key={idx} className="rounded-md border border-border/60 p-3">
                                        <h4 className="text-sm font-semibold mb-1">{section.title}</h4>
                                        <p className="text-sm text-muted-foreground whitespace-pre-line">{section.content}</p>
                                        {section.items && section.items.length > 0 && (
                                          <ul className="mt-1.5 space-y-0.5">
                                            {section.items.map((item, i) => (
                                              <li key={i} className="text-xs text-muted-foreground">
                                                {item.href ? (
                                                  <a href={item.href} className="text-primary hover:underline">{item.text}</a>
                                                ) : (
                                                  item.text
                                                )}
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Meeting Prep Brief */}
                                {meetingPrepBrief && (
                                  <MeetingPrepBriefView
                                    brief={meetingPrepBrief}
                                    onDismiss={() => setMeetingPrepBrief(null)}
                                    className="mt-2"
                                  />
                                )}

                                {/* ExecutionProgress replaced by ExecutionPlanView above */}
                                {/* Keep commented for now as fallback if needed */}
                                {/* executingPlan && (
                                  <ExecutionProgress
                                    plan={executingPlan}
                                    isExecuting={isExecutingPlan}
                                    executionResult={executionResult ?? undefined}
                                    stepProgress={
                                      stepProgress.length > 0 ? stepProgress : undefined
                                    }
                                    executionError={executionError ?? undefined}
                                    onRetry={handleExecutionRetry}
                                    onCancel={handleExecutionCancel}
                                  />
                                ) */}

                                {/* Execution completion summary */}
                                {executionResult && !isExecutingPlan && (
                                  <div className="mt-3 rounded-lg border border-green-200 dark:border-green-800/50 bg-green-50/30 dark:bg-green-950/10 p-4">
                                    <div className="flex items-start gap-3">
                                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-green-900 dark:text-green-100 font-medium">
                                          {executionResult}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Execution error display */}
                                {executionError && (
                                  <div className="mt-3 rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50/30 dark:bg-red-950/10 p-4">
                                    <div className="flex items-start gap-3">
                                      <X className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-red-900 dark:text-red-100 font-medium">
                                          Execution failed
                                        </p>
                                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                                          {executionError}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-3">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleExecutionRetry}
                                        className="text-xs"
                                      >
                                        Retry
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleExecutionCancel}
                                        className="text-xs"
                                      >
                                        Dismiss
                                      </Button>
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
                      <ThinkingIndicator />
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
    </aside>
  )
}

