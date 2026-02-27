"use client"

import { createPortal } from "react-dom"
import { Command, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export interface MentionItem {
  id: string
  label: string
  title?: string | null
}

export interface MentionListProps {
  items: MentionItem[]
  selectedIndex: number
  onSelect: (item: MentionItem) => void
  position: { top: number; left: number }
}

/**
 * Floating suggestion dropdown for @mentions.
 * Renders via portal for correct z-index. Used by TipTap suggestion plugin.
 */
export function MentionList({
  items,
  selectedIndex,
  onSelect,
  position,
}: MentionListProps) {
  if (items.length === 0) {
    return null
  }

  const content = (
    <div
      className="fixed z-50 min-w-[240px] max-w-[320px] rounded-md border bg-popover p-1 shadow-md"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <Command>
        <CommandList className="max-h-[240px]">
          <CommandEmpty>No results found.</CommandEmpty>
          {items.map((item, index) => (
            <CommandItem
              key={item.id}
              onSelect={() => onSelect(item)}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer",
                index === selectedIndex && "bg-accent text-accent-foreground"
              )}
            >
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarFallback className="text-xs">
                  {item.label
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-medium truncate">{item.label}</span>
                {item.title && (
                  <span className="text-xs text-muted-foreground truncate">
                    {item.title}
                  </span>
                )}
              </div>
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </div>
  )

  return createPortal(content, document.body)
}
