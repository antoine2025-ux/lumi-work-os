"use client"

import { useEffect } from "react"
import { AILogo } from "@/components/ai-logo"
import { LoopbrainAssistantPanel } from "./assistant-panel"
import { useLoopbrainAssistant } from "./assistant-context"
import type { LoopbrainMode } from "@/lib/loopbrain/orchestrator-types"

export interface LoopbrainAssistantLauncherProps {
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
}

/**
 * Loopbrain Assistant Launcher
 * 
 * Renders a floating button (bottom-right) that opens the Loopbrain assistant panel.
 * The panel is mode-aware and uses the provided anchors for context.
 * State persists across page navigation when there's an active session.
 */
export function LoopbrainAssistantLauncher({
  mode,
  anchors = {}
}: LoopbrainAssistantLauncherProps) {
  const { state, setIsOpen, setMode, setAnchors } = useLoopbrainAssistant()

  // Update mode and anchors when they change (e.g., navigating between pages)
  // Only update if they actually changed to avoid infinite loops
  useEffect(() => {
    if (state.mode !== mode) {
      setMode(mode)
    }
  }, [mode, state.mode, setMode])

  useEffect(() => {
    const anchorsChanged = JSON.stringify(state.anchors) !== JSON.stringify(anchors)
    if (anchorsChanged) {
      setAnchors(anchors)
    }
  }, [anchors, state.anchors, setAnchors])

  // Use state from context (persists across navigation)
  const isOpen = state.isOpen

  return (
    <>
      {/* Floating button - only visible when panel is closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 z-50 flex items-center justify-center group overflow-hidden"
          aria-label="Open AI Assistant"
        >
          <AILogo 
            width={28} 
            height={28} 
            className="w-7 h-7 group-hover:scale-110 transition-transform"
            priority
          />
        </button>
      )}

      {/* Assistant Panel */}
      <LoopbrainAssistantPanel
        mode={mode}
        anchors={anchors}
        open={isOpen}
        onOpenChange={setIsOpen}
        displayMode="floating"
      />
    </>
  )
}

