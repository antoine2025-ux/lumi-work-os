"use client"

import { useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
  category: "navigation" | "creation" | "action" | "search"
}

export function useKeyboardShortcuts() {
  const router = useRouter()

  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts
    {
      key: "k",
      metaKey: true,
      action: () => {
        document.dispatchEvent(new CustomEvent("openCommandPalette"))
      },
      description: "Open command palette (Mac)",
      category: "navigation"
    },
    {
      key: "k",
      ctrlKey: true,
      action: () => {
        document.dispatchEvent(new CustomEvent("openCommandPalette"))
      },
      description: "Open command palette (Windows/Linux)",
      category: "navigation"
    },
    {
      key: "/",
      action: () => {
        // Focus search or open command palette
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        } else {
          // Fallback to command palette
          const event = new KeyboardEvent("keydown", {
            key: "k",
            metaKey: true,
            bubbles: true
          })
          document.dispatchEvent(event)
        }
      },
      description: "Focus search",
      category: "search"
    },
    {
      key: ".",
      action: () => {
        // Open quick actions menu
      },
      description: "Quick actions",
      category: "action"
    },

    // Creation shortcuts
    {
      key: "n",
      action: () => {
        // Create new task (context-aware)
      },
      description: "New task",
      category: "creation"
    },
    {
      key: "n",
      shiftKey: true,
      action: () => {
        // Create new project
      },
      description: "New project",
      category: "creation"
    },
    {
      key: "n",
      altKey: true,
      action: () => {
        // Create new wiki page
      },
      description: "New wiki page",
      category: "creation"
    },

    // Action shortcuts (context-aware)
    {
      key: "a",
      action: () => {
        // Assign (context-aware)
      },
      description: "Assign",
      category: "action"
    },
    {
      key: "s",
      action: () => {
        // Status (context-aware)
      },
      description: "Change status",
      category: "action"
    },
    {
      key: "p",
      action: () => {
        // Priority (context-aware)
      },
      description: "Set priority",
      category: "action"
    },

    // Navigation shortcuts
    {
      key: "g",
      action: () => router.push("/"),
      description: "Go to dashboard",
      category: "navigation"
    },
    {
      key: "g",
      metaKey: true,
      action: () => router.push("/projects"),
      description: "Go to projects",
      category: "navigation"
    },
    {
      key: "g",
      shiftKey: true,
      action: () => router.push("/wiki"),
      description: "Go to wiki",
      category: "navigation"
    },
    {
      key: "g",
      altKey: true,
      action: () => router.push("/ask"),
      description: "Go to AI assistant",
      category: "navigation"
    },

    // Escape key
    {
      key: "Escape",
      action: () => {
        // Close any open modals, menus, or focus
        const activeElement = document.activeElement as HTMLElement
        if (activeElement && activeElement.blur) {
          activeElement.blur()
        }
        
        // Close any open context menus
        const contextMenus = document.querySelectorAll("[data-context-menu]")
        contextMenus.forEach(menu => {
          if (menu instanceof HTMLElement) {
            menu.style.display = "none"
          }
        })
      },
      description: "Close/Cancel",
      category: "action"
    }
  ]

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target?.contentEditable === "true" ||
      target?.isContentEditable
    ) {
      return
    }

    // Find matching shortcut
    const matchingShortcut = shortcuts.find(shortcut => {
      return (
        shortcut.key.toLowerCase() === event.key.toLowerCase() &&
        !!shortcut.ctrlKey === !!event.ctrlKey &&
        !!shortcut.metaKey === !!event.metaKey &&
        !!shortcut.shiftKey === !!event.shiftKey &&
        !!shortcut.altKey === !!event.altKey
      )
    })

    if (matchingShortcut) {
      event.preventDefault()
      event.stopPropagation()
      matchingShortcut.action()
    }
  }, [shortcuts])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return {
    shortcuts: shortcuts.map(({ action, ...shortcut }) => shortcut)
  }
}

// Hook for getting keyboard shortcut help
export function useKeyboardShortcutHelp() {
  const { shortcuts } = useKeyboardShortcuts()
  
  const getShortcutsByCategory = (category: KeyboardShortcut["category"]) => {
    return shortcuts.filter(shortcut => shortcut.category === category)
  }

  const getShortcutString = (shortcut: Omit<KeyboardShortcut, "action">) => {
    const parts = []
    if (shortcut.metaKey) parts.push("⌘")
    if (shortcut.ctrlKey) parts.push("Ctrl")
    if (shortcut.altKey) parts.push("Alt")
    if (shortcut.shiftKey) parts.push("Shift")
    parts.push(shortcut.key.toUpperCase())
    return parts.join(" + ")
  }

  return {
    shortcuts,
    getShortcutsByCategory,
    getShortcutString
  }
}
