"use client"

import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"

export function KeyboardShortcutsWrapper({ children }: { children: React.ReactNode }) {
  useKeyboardShortcuts()
  return <>{children}</>
}
