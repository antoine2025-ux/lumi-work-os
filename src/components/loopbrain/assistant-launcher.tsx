"use client"

import { useEffect } from "react"
import { AILogo } from "@/components/ai-logo"
import { LoopbrainAssistantPanel } from "./assistant-panel"
import { useLoopbrainAssistant } from "./assistant-context"
import type { LoopbrainMode } from "@/lib/loopbrain/orchestrator-types"

export interface LoopbrainAssistantLauncherProps {
  /** Operating mode */
  mode: LoopbrainMode
  /** @deprecated Use useLoopbrainAnchors in pages instead - anchors are set via context */
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
 * Anchors (pageId, projectId, etc.) are set by pages via useLoopbrainAnchors - the
 * launcher reads from context to avoid overwriting page-specific context.
 */
export function LoopbrainAssistantLauncher({
  mode,
}: LoopbrainAssistantLauncherProps) {
  const { state, setIsOpen, setMode } = useLoopbrainAssistant()

  // Update mode when it changes (e.g., navigating between pages)
  useEffect(() => {
    if (state.mode !== mode) {
      setMode(mode)
    }
  }, [mode, state.mode, setMode])

  const isOpen = state.isOpen

  return (
    <>
      {/* Floating button - always visible when panel is closed */}
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

      {/* Assistant Panel - uses state.anchors from context (set by useLoopbrainAnchors) */}
      <LoopbrainAssistantPanel
        mode={mode}
        anchors={state.anchors}
        open={isOpen}
        onOpenChange={setIsOpen}
        displayMode="floating"
      />
    </>
  )
}

