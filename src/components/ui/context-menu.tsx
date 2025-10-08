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
    
    console.log("Context menu triggered!", e.target)
    
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return

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
    if (!item.disabled) {
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
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[200px]"
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          {items.map((item, index) => {
            if (item.separator) {
              return (
                <div key={`separator-${index}`} className="border-t border-gray-100 my-1" />
              )
            }

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={cn(
                  "w-full flex items-center px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors",
                  item.disabled && "opacity-50 cursor-not-allowed",
                  item.destructive && "text-red-600 hover:bg-red-50"
                )}
              >
                {item.icon && (
                  <item.icon className="h-4 w-4 mr-3 text-gray-400" />
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
  project: (project: any): ContextMenuItem[] => [
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
      action: () => console.log("Edit project", project.id)
    },
    { id: "separator-1", label: "", separator: true },
    {
      id: "assign",
      label: "Assign",
      icon: UserPlus,
      action: () => console.log("Assign project", project.id)
    },
    {
      id: "priority",
      label: "Set Priority",
      icon: Flag,
      action: () => console.log("Set priority", project.id)
    },
    {
      id: "status",
      label: "Change Status",
      icon: MoreHorizontal,
      action: () => console.log("Change status", project.id)
    },
    { id: "separator-2", label: "", separator: true },
    {
      id: "duplicate",
      label: "Duplicate",
      icon: Copy,
      action: () => console.log("Duplicate project", project.id)
    },
    {
      id: "move",
      label: "Move",
      icon: Move,
      action: () => console.log("Move project", project.id)
    },
    {
      id: "archive",
      label: "Archive",
      icon: Archive,
      action: () => console.log("Archive project", project.id)
    },
    {
      id: "delete",
      label: "Delete",
      icon: Trash2,
      action: () => {
        if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
          // TODO: Delete project
          console.log("Delete project", project.id)
        }
      },
      destructive: true
    }
  ],

  task: (task: any): ContextMenuItem[] => [
    {
      id: "open",
      label: "Open",
      icon: Eye,
      action: () => {
        // TODO: Open task detail modal or page
        console.log("Open task", task.id)
      }
    },
    {
      id: "edit",
      label: "Edit",
      icon: Edit,
      action: () => console.log("Edit task", task.id)
    },
    { id: "separator-1", label: "", separator: true },
    {
      id: "assign",
      label: "Assign",
      icon: UserPlus,
      action: () => console.log("Assign task", task.id)
    },
    {
      id: "status",
      label: "Change Status",
      icon: Flag,
      action: () => console.log("Change status", task.id)
    },
    {
      id: "priority",
      label: "Set Priority",
      icon: Star,
      action: () => console.log("Set priority", task.id)
    },
    {
      id: "due-date",
      label: "Set Due Date",
      icon: Calendar,
      action: () => console.log("Set due date", task.id)
    },
    {
      id: "tags",
      label: "Add Tags",
      icon: Tag,
      action: () => console.log("Add tags", task.id)
    },
    { id: "separator-2", label: "", separator: true },
    {
      id: "duplicate",
      label: "Duplicate",
      icon: Copy,
      action: () => console.log("Duplicate task", task.id)
    },
    {
      id: "move",
      label: "Move",
      icon: Move,
      action: () => console.log("Move task", task.id)
    },
    {
      id: "archive",
      label: "Archive",
      icon: Archive,
      action: () => console.log("Archive task", task.id)
    },
    {
      id: "delete",
      label: "Delete",
      icon: Trash2,
      action: () => console.log("Delete task", task.id),
      destructive: true
    }
  ],

  wiki: (page: any): ContextMenuItem[] => [
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
      action: () => console.log("Edit wiki page", page.id)
    },
    { id: "separator-1", label: "", separator: true },
    {
      id: "comment",
      label: "Add Comment",
      icon: MessageSquare,
      action: () => console.log("Add comment", page.id)
    },
    {
      id: "tags",
      label: "Add Tags",
      icon: Tag,
      action: () => console.log("Add tags", page.id)
    },
    { id: "separator-2", label: "", separator: true },
    {
      id: "duplicate",
      label: "Duplicate",
      icon: Copy,
      action: () => console.log("Duplicate wiki page", page.id)
    },
    {
      id: "move",
      label: "Move",
      icon: Move,
      action: () => console.log("Move wiki page", page.id)
    },
    {
      id: "archive",
      label: "Archive",
      icon: Archive,
      action: () => console.log("Archive wiki page", page.id)
    },
    {
      id: "delete",
      label: "Delete",
      icon: Trash2,
      action: () => console.log("Delete wiki page", page.id),
      destructive: true
    }
  ]
}
