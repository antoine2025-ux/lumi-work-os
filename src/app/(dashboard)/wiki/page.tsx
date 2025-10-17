"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  BookOpen, 
  Plus, 
  Search, 
  Sparkles,
  Clock,
  User,
  Tag,
  FileText,
  Folder,
  Star,
  Loader2,
  ChevronRight,
  MoreHorizontal,
  Edit3,
  Trash2,
  Eye,
  Share2
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function WikiPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [wikiPages, setWikiPages] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // Helper function to create a safe HTML excerpt
  const createExcerpt = (content: string) => {
    if (!content) return ''
    
    // First try to strip HTML and create a clean excerpt
    const stripped = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    
    // If the stripped content is too short or looks like raw HTML, try to extract meaningful text
    if (stripped.length < 50 || stripped.includes('class=') || stripped.includes('style=')) {
      // Try to extract text from common HTML patterns
      const textMatch = content.match(/>([^<]+)</g)
      if (textMatch) {
        const textParts = textMatch.map(match => match.slice(1, -1).trim()).filter(part => part.length > 0)
        return textParts.join(' ').substring(0, 150) + (textParts.join(' ').length > 150 ? '...' : '')
      }
    }
    
    return stripped.substring(0, 150) + (stripped.length > 150 ? '...' : '')
  }

  // Load pages from API
  useEffect(() => {
    const loadPages = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/wiki/pages?workspaceId=cmgl0f0wa00038otlodbw5jhn')
        if (response.ok) {
          const result = await response.json()
          const data = result.data || result
          if (Array.isArray(data)) {
            const transformedPages = data.map((page: any) => ({
              ...page,
              author: page.createdBy?.name || 'Unknown',
              lastModified: page.updatedAt,
              excerpt: createExcerpt(page.excerpt || page.content || ''),
              status: page.isPublished ? 'published' : 'draft',
              views: 0,
              isStarred: false,
              category: page.category || 'general'
            }))
            setWikiPages(transformedPages)
          } else {
            setWikiPages([])
          }
        } else {
          setWikiPages([])
        }
      } catch (error) {
        console.error('Error loading pages:', error)
        setWikiPages([])
      } finally {
        setIsLoading(false)
      }
    }

    loadPages()
  }, [])

  const handleNewPage = () => {
    router.push('/wiki/new')
  }

  // Filter pages based on search and category
  const filteredPages = wikiPages.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         page.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || page.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = Array.from(new Set(wikiPages.map(page => page.category)))

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Loading your knowledge base...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Knowledge Base</h1>
              <p className="text-gray-600">Your team's central hub for documentation and knowledge</p>
            </div>
            <Button 
              onClick={handleNewPage}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Page
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search your knowledge base..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <Button 
              variant="outline" 
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Ask AI
            </Button>
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
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

        {/* Welcome Banner */}
        {filteredPages.length === 0 && !searchQuery && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to your Knowledge Base</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Start building your team's knowledge by creating your first page. 
                Share information, document processes, and keep everyone aligned.
              </p>
              <Button 
                onClick={handleNewPage}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Page
              </Button>
            </div>
          </div>
        )}

        {/* Empty Search State */}
        {filteredPages.length === 0 && searchQuery && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No pages found</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search terms or browse all pages.
              </p>
              <Button 
                variant="outline"
                onClick={() => setSearchQuery("")}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Clear Search
              </Button>
            </div>
          </div>
        )}

        {/* Pages Grid */}
        {filteredPages.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPages.map((page) => (
              <div
                key={page.id}
                className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-sm group"
              >
                <div className="p-6">
                  {/* Page Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          <Link href={`/wiki/${page.slug}`} className="hover:underline">
                            {page.title}
                          </Link>
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="secondary" 
                            className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-200"
                          >
                            {page.category}
                          </Badge>
                          {page.status === 'draft' && (
                            <Badge variant="outline" className="text-xs border-orange-200 text-orange-600">
                              Draft
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Page Content Preview */}
                  {page.excerpt && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {page.excerpt}
                    </p>
                  )}

                  {/* Page Footer */}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{page.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(page.lastModified)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Share2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-12 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2 border-gray-300 hover:bg-gray-50"
              onClick={handleNewPage}
            >
              <Plus className="h-6 w-6 text-gray-600" />
              <span className="text-sm font-medium">New Page</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2 border-gray-300 hover:bg-gray-50"
            >
              <Folder className="h-6 w-6 text-gray-600" />
              <span className="text-sm font-medium">Organize</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2 border-gray-300 hover:bg-gray-50"
            >
              <Star className="h-6 w-6 text-gray-600" />
              <span className="text-sm font-medium">Favorites</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2 border-gray-300 hover:bg-gray-50"
            >
              <Sparkles className="h-6 w-6 text-gray-600" />
              <span className="text-sm font-medium">AI Assistant</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}