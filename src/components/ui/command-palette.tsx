"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { 
  Search, 
  Plus, 
  FileText, 
  Users, 
  Settings, 
  BookOpen,
  Bot,
  Building2,
  Shield,
  Zap,
  Command,
  ArrowRight,
  Hash,
  AtSign
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CommandItem {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  keywords: string[]
  category: "navigation" | "create" | "search" | "quick"
}

interface SearchResult {
  id: string
  title: string
  description: string
  type: "project" | "task" | "wiki" | "user"
  url: string
  icon: React.ComponentType<{ className?: string }>
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  // const { enabled: cmdKEnabled } = useFeatureFlag("cmd_k_palette")

  // Fetch search results
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      if (!query || query.length < 2) return []
      
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      if (!response.ok) return []
      
      const data = await response.json()
      return data.results || []
    },
    enabled: query.length >= 2,
    staleTime: 30000, // 30 seconds
  })

  // Define command items
  const commandItems: CommandItem[] = [
    // Navigation
    {
      id: "nav-dashboard",
      title: "Go to Dashboard",
      description: "View project overview and quick actions",
      icon: Search,
      action: () => router.push("/"),
      keywords: ["dashboard", "home", "overview"],
      category: "navigation"
    },
    {
      id: "nav-wiki",
      title: "Go to Wiki",
      description: "Browse knowledge base and documentation",
      icon: BookOpen,
      action: () => router.push("/wiki"),
      keywords: ["wiki", "docs", "knowledge", "documentation"],
      category: "navigation"
    },
    {
      id: "nav-ask",
      title: "LoopBrain",
      description: "AI-powered assistance and document generation",
      icon: Bot,
      action: () => router.push("/ask"),
      keywords: ["ai", "ask", "assistant", "help"],
      category: "navigation"
    },
    {
      id: "nav-projects",
      title: "Go to Projects",
      description: "Manage projects and tasks",
      icon: FileText,
      action: () => router.push("/projects"),
      keywords: ["projects", "tasks", "kanban"],
      category: "navigation"
    },
    {
      id: "nav-org",
      title: "Organization Chart",
      description: "View team structure and hierarchy",
      icon: Building2,
      action: () => router.push("/org"),
      keywords: ["org", "team", "structure", "hierarchy"],
      category: "navigation"
    },
    {
      id: "nav-admin",
      title: "Admin Panel",
      description: "User management and administration",
      icon: Shield,
      action: () => router.push("/admin"),
      keywords: ["admin", "users", "management"],
      category: "navigation"
    },
    {
      id: "nav-settings",
      title: "Settings",
      description: "Workspace configuration and preferences",
      icon: Settings,
      action: () => router.push("/settings"),
      keywords: ["settings", "preferences", "config"],
      category: "navigation"
    },

    // Create actions
    {
      id: "create-task",
      title: "Create New Task",
      description: "Add a new task to a project",
      icon: Plus,
      action: () => {
        // This would open a task creation modal
        console.log("Create task")
      },
      keywords: ["create", "new", "task", "add"],
      category: "create"
    },
    {
      id: "create-project",
      title: "Create New Project",
      description: "Start a new project",
      icon: Plus,
      action: () => {
        // This would open a project creation modal
        console.log("Create project")
      },
      keywords: ["create", "new", "project", "start"],
      category: "create"
    },
    {
      id: "create-wiki",
      title: "Create Wiki Page",
      description: "Add new documentation",
      icon: Plus,
      action: () => {
        // This would open a wiki page creation modal
        console.log("Create wiki page")
      },
      keywords: ["create", "new", "wiki", "page", "doc"],
      category: "create"
    },

    // Quick actions
    {
      id: "quick-search",
      title: "Search Everything",
      description: "Search across projects, tasks, wiki, and people",
      icon: Search,
      action: () => {
        setQuery("")
        // Focus on search input
      },
      keywords: ["search", "find", "look"],
      category: "quick"
    }
  ]

  // Filter items based on query
  const filteredItems = commandItems.filter(item => {
    if (!query) return true
    const searchTerm = query.toLowerCase()
    return (
      item.title.toLowerCase().includes(searchTerm) ||
      item.description.toLowerCase().includes(searchTerm) ||
      item.keywords.some(keyword => keyword.includes(searchTerm))
    )
  })

  // Combine command items and search results
  const allItems = [
    ...filteredItems,
    ...searchResults.map((result: SearchResult) => ({
      id: `search-${result.id}`,
      title: result.title,
      description: result.description,
      icon: result.icon,
      action: () => router.push(result.url),
      keywords: [],
      category: "search" as const
    }))
  ]

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      console.log("CmdK pressed, opening command palette")
      setIsOpen(true)
      setQuery("")
      setSelectedIndex(0)
    }
    
    if (!isOpen) return

    if (e.key === "Escape") {
      setIsOpen(false)
      setQuery("")
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action()
        setIsOpen(false)
        setQuery("")
      }
    }
  }, [isOpen, selectedIndex, allItems])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    
    // Listen for custom command palette open event
    const handleOpenCommandPalette = () => {
      console.log("Custom command palette event received")
      setIsOpen(true)
      setQuery("")
      setSelectedIndex(0)
    }
    
    document.addEventListener("openCommandPalette", handleOpenCommandPalette)
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("openCommandPalette", handleOpenCommandPalette)
    }
  }, [handleKeyDown])

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-20">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-2xl mx-4">
        {/* Search input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200">
          <Search className="h-4 w-4 text-gray-400 mr-3" />
          <input
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 outline-none text-sm"
            autoFocus
          />
          <div className="flex items-center text-xs text-gray-400 ml-3">
            <Command className="h-3 w-3 mr-1" />
            K
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {allItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              {isLoading ? "Searching..." : "No results found"}
            </div>
          ) : (
            <div className="py-2">
              {allItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action()
                    setIsOpen(false)
                    setQuery("")
                  }}
                  className={cn(
                    "w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors",
                    index === selectedIndex && "bg-blue-50 border-r-2 border-blue-500"
                  )}
                >
                  <item.icon className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {item.title}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {item.description}
                    </div>
                  </div>
                  {item.category === "search" && (
                    <ArrowRight className="h-3 w-3 text-gray-400 ml-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>Esc Close</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>Search with:</span>
              <span className="flex items-center">
                <Hash className="h-3 w-3 mr-1" />
                projects
              </span>
              <span className="flex items-center">
                <AtSign className="h-3 w-3 mr-1" />
                people
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
