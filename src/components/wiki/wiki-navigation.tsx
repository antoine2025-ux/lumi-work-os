"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  Plus, 
  Folder, 
  FileText, 
  ChevronRight,
  ChevronDown,
  BookOpen,
  Star,
  Sparkles,
  Clock,
  User,
  Tag
} from "lucide-react"

interface WikiNavigationProps {
  currentPath: string
}

interface WikiPage {
  id: string
  title: string
  slug: string
  tags: string[]
  updatedAt: string
  category: string
  createdBy?: {
    name: string
  }
}

export function WikiNavigation({ currentPath }: WikiNavigationProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [wikiPages, setWikiPages] = useState<WikiPage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const router = useRouter()

  // Fetch wiki pages from API
  useEffect(() => {
    const fetchPages = async () => {
      try {
        const response = await fetch('/api/wiki/pages?workspaceId=cmgl0f0wa00038otlodbw5jhn')
        if (response.ok) {
          const result = await response.json()
          const data = result.data || result
          if (Array.isArray(data)) {
            setWikiPages(data)
          } else {
            setWikiPages([])
          }
        }
      } catch (error) {
        console.error('Error fetching wiki pages:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPages()
  }, [])

  const createNavigationStructure = () => {
    const homePage = {
      id: "home",
      title: "Knowledge Base",
      type: "page" as const,
      href: "/wiki",
      isStarred: true
    }

    // Show all pages individually for now (simpler approach)
    const allPages = Array.isArray(wikiPages) ? wikiPages.map(page => ({
      id: page.id,
      title: page.title,
      type: "page" as const,
      href: `/wiki/${page.slug}`,
      category: page.category,
      updatedAt: page.updatedAt,
      author: page.createdBy?.name || 'Unknown'
    })) : []

    return [homePage, ...allPages]
  }

  const handleNewPage = () => {
    router.push('/wiki/new')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Filter pages based on search and category
  const filteredPages = wikiPages.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || page.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = Array.from(new Set(wikiPages.map(page => page.category)))

  const navigationItems = createNavigationStructure()

  return (
    <div className="w-80 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Knowledge Base</h2>
          <Button 
            onClick={handleNewPage}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Filters */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              selectedCategory === "all" 
                ? "bg-blue-100 text-blue-700" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors capitalize ${
                selectedCategory === category 
                  ? "bg-blue-100 text-blue-700" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Loading pages...</p>
          </div>
        ) : (
          <div className="p-4">
            {/* Home Link */}
            <Link
              href="/wiki"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2",
                currentPath === "/wiki" 
                  ? "bg-blue-100 text-blue-700" 
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                <BookOpen className="h-3 w-3 text-blue-600" />
              </div>
              <span>Knowledge Base</span>
            </Link>

            {/* Pages List */}
            <div className="space-y-1">
              {filteredPages.map((page) => (
                <Link
                  key={page.id}
                  href={`/wiki/${page.slug}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group",
                    currentPath === `/wiki/${page.slug}` 
                      ? "bg-blue-100 text-blue-700" 
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <FileText className="h-3 w-3 text-gray-600 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{page.title}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span className="capitalize">{page.category}</span>
                      <span>•</span>
                      <span>{formatDate(page.updatedAt)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Empty State */}
            {filteredPages.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  {searchQuery ? 'No pages found' : 'No pages yet'}
                </p>
                {!searchQuery && (
                  <Button 
                    onClick={handleNewPage}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Page
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <Button 
          variant="outline" 
          className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Ask AI
        </Button>
      </div>
    </div>
  )
}