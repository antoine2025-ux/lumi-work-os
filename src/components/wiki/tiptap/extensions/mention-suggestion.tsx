/**
 * TipTap Mention suggestion config.
 * Renders MentionList via React portal when user types "@".
 */

"use client"

import { createRoot, type Root } from "react-dom/client"
import Mention from "@tiptap/extension-mention"
import type { SuggestionProps } from "@tiptap/suggestion"
import { MentionList, type MentionItem } from "@/components/editor/MentionList"
import { fetchPeopleForMentions } from "@/lib/mentions/fetch-people"

const MAX_SUGGESTIONS = 8

function createMentionSuggestionConfig() {
  let container: HTMLDivElement | null = null
  let reactRoot: Root | null = null
  let selectedIndex = 0
  let currentProps: SuggestionProps<MentionItem, MentionItem> | null = null

  const renderList = () => {
    if (!container || !reactRoot || !currentProps) return

    const rect = currentProps.clientRect?.()
    const position = rect
      ? { top: rect.bottom + 4, left: rect.left }
      : { top: 0, left: 0 }

    reactRoot.render(
      <MentionList
        items={currentProps.items}
        selectedIndex={selectedIndex}
        onSelect={(item) => currentProps?.command(item)}
        position={position}
      />
    )
  }

  return {
    char: "@" as const,
    items: async ({ query }: { query: string }) => {
      const people = await fetchPeopleForMentions()
      const q = query.toLowerCase()
      const filtered = people
        .filter(
          (p) =>
            p.fullName.toLowerCase().includes(q) ||
            (p.email?.toLowerCase().includes(q) ?? false)
        )
        .slice(0, MAX_SUGGESTIONS)
      return filtered.map((p) => ({
        id: p.userId,
        label: p.fullName,
        title: p.title ?? p.team?.name ?? null,
      }))
    },
    render: () => ({
      onStart: (props: SuggestionProps<MentionItem, MentionItem>) => {
        currentProps = props
        selectedIndex = 0
        container = document.createElement("div")
        document.body.appendChild(container)
        reactRoot = createRoot(container)
        renderList()
      },
      onUpdate: (props: SuggestionProps<MentionItem, MentionItem>) => {
        currentProps = props
        selectedIndex = Math.min(selectedIndex, Math.max(0, props.items.length - 1))
        renderList()
      },
      onKeyDown: ({
        event,
      }: {
        view: unknown
        event: KeyboardEvent
        range: { from: number; to: number }
      }) => {
        if (!currentProps) return false

        if (event.key === "ArrowDown") {
          event.preventDefault()
          selectedIndex =
            selectedIndex < currentProps.items.length - 1
              ? selectedIndex + 1
              : 0
          renderList()
          return true
        }

        if (event.key === "ArrowUp") {
          event.preventDefault()
          selectedIndex =
            selectedIndex > 0 ? selectedIndex - 1 : currentProps.items.length - 1
          renderList()
          return true
        }

        if (event.key === "Enter") {
          event.preventDefault()
          const item = currentProps.items[selectedIndex]
          if (item) {
            currentProps.command(item)
          }
          return true
        }

        if (event.key === "Escape") {
          return false
        }

        return false
      },
      onExit: () => {
        currentProps = null
        if (reactRoot && container) {
          reactRoot.unmount()
          container.remove()
          reactRoot = null
          container = null
        }
      },
    }),
  }
}

export function createMentionExtension() {
  return Mention.configure({
    HTMLAttributes: {
      class: "mention",
      "data-type": "mention",
    },
    renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
    renderHTML: ({ node }) => [
      "span",
      {
        "data-type": "mention",
        "data-id": node.attrs.id,
        "data-label": node.attrs.label,
        class: "mention",
      },
      `@${node.attrs.label ?? node.attrs.id}`,
    ],
    suggestion: createMentionSuggestionConfig(),
  })
}
