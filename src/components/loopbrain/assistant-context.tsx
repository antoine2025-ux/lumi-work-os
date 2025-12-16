"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import type { LoopbrainMode } from "@/lib/loopbrain/orchestrator-types"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AssistantState {
  isOpen: boolean
  isMinimized: boolean
  messages: Message[]
  mode: LoopbrainMode | null
  anchors: {
    pageId?: string
    projectId?: string
    taskId?: string
    roleId?: string
    teamId?: string
  }
}

interface AssistantContextValue {
  state: AssistantState
  setIsOpen: (open: boolean) => void
  setIsMinimized: (minimized: boolean) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  clearMessages: () => void
  setMode: (mode: LoopbrainMode | null) => void
  setAnchors: (anchors: AssistantState['anchors']) => void
}

const AssistantContext = createContext<AssistantContextValue | undefined>(undefined)

const STORAGE_KEY = 'loopbrain_assistant_state'

function loadStateFromStorage(): Partial<AssistantState> {
  if (typeof window === 'undefined') return {}
  
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Convert message timestamps back to Date objects
      if (parsed.messages) {
        parsed.messages = parsed.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }
      return parsed
    }
  } catch (error) {
    console.error('Error loading assistant state from storage:', error)
  }
  return {}
}

function saveStateToStorage(state: AssistantState) {
  if (typeof window === 'undefined') return
  
  try {
    // Only save if there's an active session (messages exist)
    if (state.messages.length > 0) {
      // Save state including open/minimized state so it persists across navigation
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        messages: state.messages,
        isOpen: state.isOpen,
        isMinimized: state.isMinimized,
        mode: state.mode,
        anchors: state.anchors
      }))
    } else {
      // Clear storage if no messages
      sessionStorage.removeItem(STORAGE_KEY)
    }
  } catch (error) {
    console.error('Error saving assistant state to storage:', error)
  }
}

const initialState: AssistantState = {
  isOpen: false,
  isMinimized: false,
  messages: [],
  mode: null,
  anchors: {}
}

export function LoopbrainAssistantProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AssistantState>(() => {
    const stored = loadStateFromStorage()
    const hasMessages = stored.messages && stored.messages.length > 0
    return {
      ...initialState,
      ...stored,
      // If there are messages, restore the open state (but default to closed if not stored)
      // Otherwise, always start closed
      isOpen: hasMessages ? (stored.isOpen ?? false) : false,
      isMinimized: stored.isMinimized ?? false
    }
  })

  // Save state to storage whenever it changes (but only if there are messages)
  useEffect(() => {
    saveStateToStorage(state)
  }, [state])

  const setIsOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, isOpen: open }))
  }, [])

  const setIsMinimized = useCallback((minimized: boolean) => {
    setState(prev => ({ ...prev, isMinimized: minimized }))
  }, [])

  const setMessages = useCallback((messages: Message[]) => {
    setState(prev => ({ ...prev, messages }))
  }, [])

  const addMessage = useCallback((message: Message) => {
    setState(prev => ({ ...prev, messages: [...prev.messages, message] }))
  }, [])

  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, messages: [] }))
  }, [])

  const setMode = useCallback((mode: LoopbrainMode | null) => {
    setState(prev => {
      // Only update if mode actually changed
      if (prev.mode === mode) return prev
      return { ...prev, mode }
    })
  }, [])

  const setAnchors = useCallback((anchors: AssistantState['anchors']) => {
    setState(prev => {
      // Only update if anchors actually changed
      const anchorsChanged = JSON.stringify(prev.anchors) !== JSON.stringify(anchors)
      if (!anchorsChanged) return prev
      return { ...prev, anchors }
    })
  }, [])

  return (
    <AssistantContext.Provider
      value={{
        state,
        setIsOpen,
        setIsMinimized,
        setMessages,
        addMessage,
        clearMessages,
        setMode,
        setAnchors
      }}
    >
      {children}
    </AssistantContext.Provider>
  )
}

export function useLoopbrainAssistant() {
  const context = useContext(AssistantContext)
  if (context === undefined) {
    throw new Error('useLoopbrainAssistant must be used within a LoopbrainAssistantProvider')
  }
  return context
}

