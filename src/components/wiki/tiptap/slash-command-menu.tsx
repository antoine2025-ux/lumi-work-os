/**
 * Slash Command Menu Component
 * 
 * Renders the slash command menu UI when user types "/"
 */

"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Command, CommandItem, CommandList, CommandEmpty } from '@/components/ui/command'
import { SlashCommandItem } from './extensions/slash-command'
import { 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Quote, 
  Minus, 
  Code, 
  CheckSquare, 
  FileText,
  Table
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SlashCommandMenuProps {
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
  position: { top: number; left: number } | null
  isOpen: boolean
  onClose: () => void
}

// Map icon names to React components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Code,
  CheckSquare,
  FileText,
  Table,
}

export function SlashCommandMenu({ 
  items, 
  command, 
  position, 
  isOpen,
  onClose 
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  // Define selectItem before useEffect that uses it
  const selectItem = useCallback((index: number) => {
    const item = items[index]
    if (item) {
      command(item)
    }
  }, [items, command])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((index) => {
          const newIndex = index > 0 ? index - 1 : items.length - 1
          return newIndex
        })
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((index) => {
          const newIndex = index < items.length - 1 ? index + 1 : 0
          return newIndex
        })
      } else if (event.key === 'Enter') {
        event.preventDefault()
        selectItem(selectedIndex)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        // Let backspace/delete close menu if query becomes empty
        // This is handled by the hook detecting the change
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, items, selectedIndex, onClose, selectItem])

  if (!isOpen || items.length === 0 || !position) {
    return null
  }

  const menuContent = (
    <div 
      ref={menuRef}
      className="fixed z-50 min-w-[280px] max-w-[320px] rounded-md border bg-popover p-1 shadow-md"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent editor from losing focus
    >
      <Command>
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {items.map((item, index) => {
            // Use icon name from item, fallback to FileText
            const Icon = (item.icon && iconMap[item.icon]) || FileText

            return (
              <CommandItem
                key={item.id} // Use stable ID instead of title
                onSelect={() => selectItem(index)}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer',
                  index === selectedIndex && 'bg-accent text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-medium">{item.title}</span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </span>
                  )}
                </div>
              </CommandItem>
            )
          })}
        </CommandList>
      </Command>
    </div>
  )

  return createPortal(menuContent, document.body)
}

