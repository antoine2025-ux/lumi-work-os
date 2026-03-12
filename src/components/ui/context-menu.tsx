"use client"

import { useState, useEffect, useRef, ReactNode } from "react"
import { 
  Eye, 
  Edit, 
  UserPlus, 
  Flag, 
  Star, 
  Copy, 
  Move, 
  Archive, 
  Trash2,
  MoreHorizontal,
  Calendar,
  Tag,
  MessageSquare
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ContextMenuItem {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  action?: () => void
  disabled?: boolean
  destructive?: boolean
  separator?: boolean
}

interface ContextMenuProps {
  children: ReactNode
  items: ContextMenuItem[]
  className?: string
}

export function ContextMenu({ children, items, className }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const x = e.clientX
    const y = e.clientY
    
    // Adjust position if menu would go off screen
    const menuWidth = 200
    const menuHeight = items.length * 40 + 16
    
    const adjustedX = x + menuWidth > window.innerWidth 
      ? x - menuWidth 
      : x
    const adjustedY = y + menuHeight > window.innerHeight 
      ? y - menuHeight 
      : y

    setPosition({ x: adjustedX, y: adjustedY })
    setIsOpen(true)
  }

  const handleItemClick = (item: ContextMenuItem) => {
    if (!item.disabled && item.action) {
      item.action()
      setIsOpen(false)
    }
  }

  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setIsOpen(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  return (
    <>
      <div
        ref={triggerRef}
        onContextMenu={handleContextMenu}
        className={className}
      >
        {children}
      </div>

      {isOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-popover rounded-lg shadow-lg border border-border py-2 min-w-[200px]"
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          {items.map((item, index) => {
            if (item.separator) {
              return (
                <div key={`separator-${index}`} className="border-t border-border my-1" />
              )
            }

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={cn(
                  "w-full flex items-center px-3 py-2 text-sm text-left hover:bg-muted transition-colors text-popover-foreground",
                  item.disabled && "opacity-50 cursor-not-allowed",
                  item.destructive && "text-destructive hover:bg-destructive/10"
                )}
              >
                {item.icon && (
                  <item.icon className="h-4 w-4 mr-3 text-muted-foreground" />
                )}
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

// Predefined context menu items for different entity types
export const contextMenuItems = {
  project: (project: { id: string; name: string }): ContextMenuItem[] => [
    {
      id: "open",
      label: "Open",
      icon: Eye,
      action: () => {
        window.location.href = `/projects/${project.id}`
      }
    },
    {
      id: "edit",
      label: "Edit",
      icon: Edit,
      action: () => { /* TODO [BACKLOG]: Wire edit project */ }
    },
    { id: "separator-1", label: "", separator: true },
    {
      id: "assign",
      label: "Assign",
      icon: UserPlus,
      action: () => { /* TODO [BACKLOG]: Wire assign project */ }
    },
    {
      id: "priority",
      label: "Set Priority",
      icon: Flag,
      action: () => { /* TODO [BACKLOG]: Wire set priority */ }
    },
    {
      id: "status",
      label: "Change Status",
      icon: MoreHorizontal,
      action: () => { /* TODO [BACKLOG]: Wire change status */ }
    },
    { id: "separator-2", label: "", separator: true },
    {
      id: "duplicate",
      label: "Duplicate",
      icon: Copy,
      action: () => { /* TODO [BACKLOG]: Wire duplicate project */ }
    },
    {
      id: "move",
      label: "Move",
      icon: Move,
      action: () => { /* TODO [BACKLOG]: Wire move project */ }
    },
    {
      id: "archive",
      label: "Archive",
      icon: Archive,
      action: () => { /* TODO [BACKLOG]: Wire archive project */ }
    },
    {
      id: "delete",
      label: "Delete",
      icon: Trash2,
      action: () => {
        if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
          // TODO [BACKLOG]: Wire project deletion API call
        }
      },
      destructive: true
    }
  ],

  task: (task: { id: string }): ContextMenuItem[] => [
    {
      id: "open",
      label: "Open",
      icon: Eye,
      action: () => {
        // TODO [BACKLOG]: Open task detail via TaskSidebar or route navigation
      }
    },
    {
      id: "edit",
      label: "Edit",
      icon: Edit,
      action: () => { /* TODO [BACKLOG]: Wire edit task */ }
    },
    { id: "separator-1", label: "", separator: true },
    {
      id: "assign",
      label: "Assign",
      icon: UserPlus,
      action: () => { /* TODO [BACKLOG]: Wire assign task */ }
    },
    {
      id: "status",
      label: "Change Status",
      icon: Flag,
      action: () => { /* TODO [BACKLOG]: Wire change status */ }
    },
    {
      id: "priority",
      label: "Set Priority",
      icon: Star,
      action: () => { /* TODO [BACKLOG]: Wire set priority */ }
    },
    {
      id: "due-date",
      label: "Set Due Date",
      icon: Calendar,
      action: () => { /* TODO [BACKLOG]: Wire set due date */ }
    },
    {
      id: "tags",
      label: "Add Tags",
      icon: Tag,
      action: () => { /* TODO [BACKLOG]: Wire add tags */ }
    },
    { id: "separator-2", label: "", separator: true },
    {
      id: "duplicate",
      label: "Duplicate",
      icon: Copy,
      action: () => { /* TODO [BACKLOG]: Wire duplicate task */ }
    },
    {
      id: "move",
      label: "Move",
      icon: Move,
      action: () => { /* TODO [BACKLOG]: Wire move task */ }
    },
    {
      id: "archive",
      label: "Archive",
      icon: Archive,
      action: () => { /* TODO [BACKLOG]: Wire archive task */ }
    },
    {
      id: "delete",
      label: "Delete",
      icon: Trash2,
      action: () => { /* TODO [BACKLOG]: Wire delete task */ },
      destructive: true
    }
  ],

  wiki: (page: { id: string; slug: string; title: string }): ContextMenuItem[] => [
    {
      id: "open",
      label: "Open",
      icon: Eye,
      action: () => {
        window.location.href = `/wiki/${page.slug}`
      }
    },
    {
      id: "edit",
      label: "Edit",
      icon: Edit,
      action: () => { /* TODO [BACKLOG]: Wire edit wiki page */ }
    },
    { id: "separator-1", label: "", separator: true },
    {
      id: "comment",
      label: "Add Comment",
      icon: MessageSquare,
      action: () => { /* TODO [BACKLOG]: Wire add comment */ }
    },
    {
      id: "tags",
      label: "Add Tags",
      icon: Tag,
      action: () => { /* TODO [BACKLOG]: Wire add tags */ }
    },
    { id: "separator-2", label: "", separator: true },
    {
      id: "duplicate",
      label: "Duplicate",
      icon: Copy,
      action: () => { /* TODO [BACKLOG]: Wire duplicate wiki page */ }
    },
    {
      id: "move",
      label: "Move",
      icon: Move,
      action: () => { /* TODO [BACKLOG]: Wire move wiki page */ }
    },
    {
      id: "archive",
      label: "Archive",
      icon: Archive,
      action: () => { /* TODO [BACKLOG]: Wire archive wiki page */ }
    },
    {
      id: "delete",
      label: "Delete",
      icon: Trash2,
      action: () => { /* TODO [BACKLOG]: Wire delete wiki page */ },
      destructive: true
    }
  ]
}
