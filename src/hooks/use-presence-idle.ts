'use client'

import { useEffect, useRef } from 'react'
import type { HocuspocusProvider } from '@hocuspocus/provider'

export type PresenceStatus = 'editing' | 'viewing' | 'idle'

interface UsePresenceIdleOptions {
  provider: HocuspocusProvider | null
  isEditorFocused: boolean
  idleTimeoutMs?: number
}

/**
 * Hook to track user presence state and update Yjs awareness.
 * 
 * States:
 * - 'editing': Editor is focused and user is active
 * - 'viewing': Page is open but editor not focused
 * - 'idle': No activity for idleTimeoutMs OR tab is backgrounded
 */
export function usePresenceIdle({
  provider,
  isEditorFocused,
  idleTimeoutMs = 2 * 60 * 1000, // 2 minutes
}: UsePresenceIdleOptions) {
  const idleTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const lastActivityRef = useRef<number>(Date.now())

  useEffect(() => {
    if (!provider?.awareness) return

    // Update presence based on editor focus
    const updatePresence = (status: PresenceStatus) => {
      if (!provider?.awareness) return
      provider.awareness.setLocalStateField('status', status)
    }

    // Reset idle timer on activity
    const resetIdleTimer = () => {
      if (!provider?.awareness) return
      
      lastActivityRef.current = Date.now()
      
      // If we were idle, transition back to appropriate state
      const currentStatus = provider.awareness.getLocalState()?.status
      if (currentStatus === 'idle') {
        updatePresence(isEditorFocused ? 'editing' : 'viewing')
      }

      // Clear existing timer
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }

      // Set new idle timer
      idleTimerRef.current = setTimeout(() => {
        updatePresence('idle')
      }, idleTimeoutMs)
    }

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('idle')
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current)
        }
      } else {
        // Page became visible again
        updatePresence(isEditorFocused ? 'editing' : 'viewing')
        resetIdleTimer()
      }
    }

    // Update status based on editor focus
    if (document.hidden) {
      updatePresence('idle')
    } else {
      updatePresence(isEditorFocused ? 'editing' : 'viewing')
      resetIdleTimer()
    }

    // Listen for activity
    window.addEventListener('mousemove', resetIdleTimer)
    window.addEventListener('keydown', resetIdleTimer)
    window.addEventListener('click', resetIdleTimer)
    window.addEventListener('scroll', resetIdleTimer)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('mousemove', resetIdleTimer)
      window.removeEventListener('keydown', resetIdleTimer)
      window.removeEventListener('click', resetIdleTimer)
      window.removeEventListener('scroll', resetIdleTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [provider, isEditorFocused, idleTimeoutMs])
}
