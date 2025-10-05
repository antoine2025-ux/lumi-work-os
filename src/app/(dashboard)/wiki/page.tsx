"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter,
  Grid,
  List,
  Edit,
  Trash2,
  Eye,
  Clock,
  User,
  Tag,
  MoreHorizontal,
  FileText,
  Folder,
  Star,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function WikiPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [wikiPages, setWikiPages] = useState<any[]>([])

  // Load pages from API
  useEffect(() => {
    const loadPages = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/wiki/pages?workspaceId=workspace-1')
        if (response.ok) {
          const data = await response.json()
          // Transform API data to match frontend expectations
          const transformedPages = data.map((page: any) => ({
            ...page,
            author: page.createdBy?.name || 'Unknown',
            lastModified: page.updatedAt,
            excerpt: stripHtml(page.excerpt || page.content || ''),
            status: page.isPublished ? 'published' : 'draft',
            views: 0, // TODO: Add view tracking
            isStarred: false, // TODO: Add starring functionality
            category: page.category || 'general' // Use the actual category from API
          }))
          setWikiPages(transformedPages)
        } else {
          // No fallback data - keep empty
          setWikiPages([])
        }
      } catch (error) {
        console.error('Error loading pages:', error)
        // Keep empty on error
        setWikiPages([])
      } finally {
        setIsLoading(false)
      }
    }

    loadPages()
  }, [])

  // Helper function to strip HTML tags
  const stripHtml = (html: string) => {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  }

  const handleNewPage = () => {
    router.push('/wiki/new')
  }

  const handleViewPage = (page: any) => {
    router.push(`/wiki/${page.slug}`)
  }

  const handleEditPage = (page: any) => {
    router.push(`/wiki/${page.slug}?edit=true`)
  }

  const categories = ["All", "general", "engineering", "sales", "marketing", "hr", "product"]
  const [selectedCategory, setSelectedCategory] = useState("All")

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      "All": "All",
      "general": "General", 
      "engineering": "Engineering",
      "sales": "Sales",
      "marketing": "Marketing",
      "hr": "HR",
      "product": "Product"
    }
    return labels[category] || category
  }

  const filteredPages = wikiPages.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         page.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         page.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === "All" || page.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-green-100 text-green-800"
      case "draft": return "bg-yellow-100 text-yellow-800"
      case "archived": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <span>Wiki</span>
          </h1>
          <p className="text-muted-foreground">
            Your company's knowledge base and documentation
          </p>
        </div>
        <Button onClick={handleNewPage}>
          <Plus className="mr-2 h-4 w-4" />
          New Page
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search pages, tags, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex space-x-2">
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
          >
            {getCategoryLabel(category)}
          </Button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wikiPages.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {wikiPages.filter(p => p.status === "published").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {wikiPages.filter(p => p.status === "draft").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Starred</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {wikiPages.filter(p => p.isStarred).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading pages...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Pages Grid/List */}
          {viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPages.map((page) => (
            <Card key={page.id} className="hover:shadow-md transition-shadow group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Link href={`/wiki/${page.slug}`}>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors cursor-pointer">
                          {page.title}
                        </CardTitle>
                      </Link>
                      {page.isStarred && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {page.excerpt}
                    </CardDescription>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {page.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span>{page.author}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(page.lastModified)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <Badge className={getStatusColor(page.status)}>
                    {page.status}
                  </Badge>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">
                      {page.views} views
                    </span>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewPage(page)}
                        title="View page"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditPage(page)}
                        title="Edit page"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPages.map((page) => (
            <Card key={page.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {page.isStarred && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Link href={`/wiki/${page.slug}`}>
                          <h3 className="font-medium hover:text-primary cursor-pointer">{page.title}</h3>
                        </Link>
                        <Badge className={getStatusColor(page.status)}>
                          {page.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {page.excerpt}
                      </p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                        <span>{page.author}</span>
                        <span>{formatDate(page.lastModified)}</span>
                        <span>{page.views} views</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex flex-wrap gap-1">
                      {page.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewPage(page)}
                        title="View page"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditPage(page)}
                        title="Edit page"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredPages.length === 0 && !isLoading && (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pages found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Try adjusting your search terms" : "Create your first wiki page to get started"}
            </p>
            <Button onClick={handleNewPage}>
              <Plus className="mr-2 h-4 w-4" />
              New Page
            </Button>
          </CardContent>
        </Card>
      )}
        </>
      )}
    </div>
  )
}

