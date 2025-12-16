"use client"

import { useState, useEffect } from "react"
import { useWorkspace } from "@/lib/workspace-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  FileText, 
  Search, 
  Link as LinkIcon, 
  ExternalLink,
  X,
  Check
} from "lucide-react"
import Link from "next/link"

interface WikiPage {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  category: string
  updatedAt: string
  createdBy: {
    id: string
    name: string
  }
}

interface WikiPageSelectorProps {
  // For backward compatibility with existing usage
  currentWikiPageId?: string
  onWikiPageSelect?: (wikiPageId: string | null) => void
  isLoading?: boolean
  
  // New reusable props
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSelect?: (page: { id: string; title: string }) => void
  workspaceId?: string
  excludePageIds?: string[]
  trigger?: React.ReactNode
}

export function WikiPageSelector({ 
  currentWikiPageId, 
  onWikiPageSelect, 
  isLoading = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSelect,
  workspaceId: propWorkspaceId,
  excludePageIds = [],
  trigger
}: WikiPageSelectorProps) {
  const { currentWorkspace } = useWorkspace()
  const [wikiPages, setWikiPages] = useState<WikiPage[]>([])
  const [isLoadingPages, setIsLoadingPages] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  
  // Use controlled open state if provided, otherwise use internal state
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setIsOpen = controlledOnOpenChange || setInternalOpen

  // Determine workspace ID - prefer prop, fallback to context, fallback to undefined
  const workspaceId = propWorkspaceId || currentWorkspace?.id

  // Load wiki pages
  useEffect(() => {
    const loadWikiPages = async () => {
      if (!workspaceId) {
        console.warn('No workspace ID available for loading wiki pages')
        setIsLoadingPages(false)
        return
      }

      try {
        setIsLoadingPages(true)
        const response = await fetch(`/api/wiki/pages?workspaceId=${workspaceId}`)
        if (response.ok) {
          const result = await response.json()
          // Handle paginated response - data is in result.data
          const data = result.data || result
          // Ensure data is an array before setting
          if (Array.isArray(data)) {
            setWikiPages(data)
          } else {
            console.warn('Expected array but got:', typeof data, data)
            setWikiPages([])
          }
        }
      } catch (error) {
        console.error('Error loading wiki pages:', error)
      } finally {
        setIsLoadingPages(false)
      }
    }

    if (isOpen && workspaceId) {
      loadWikiPages()
    }
  }, [isOpen, workspaceId])

  // Get current wiki page
  const currentWikiPage = wikiPages.find(page => page.id === currentWikiPageId)

  // Filter pages based on search, category, and excluded IDs
  const filteredPages = wikiPages.filter(page => {
    // Exclude pages that are already attached
    if (excludePageIds.includes(page.id)) {
      return false
    }
    
    const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (page.content && page.content.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === "all" || page.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = Array.from(new Set(wikiPages.map(page => page.category)))

  const handleWikiPageSelect = (page: WikiPage) => {
    // Support new onSelect callback (for attaching docs)
    if (onSelect) {
      onSelect({ id: page.id, title: page.title })
      setIsOpen(false)
      return
    }
    
    // Support legacy onWikiPageSelect callback (for primary wiki page)
    if (onWikiPageSelect) {
      onWikiPageSelect(page.id)
      setIsOpen(false)
      return
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // If using controlled mode (for documentation attachments), only render dialog
  if (controlledOpen !== undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Wiki Page</DialogTitle>
            <DialogDescription>
              Choose a wiki page to attach to this project
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Search and Filter Controls */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search pages</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search wiki pages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-48">
                <Label htmlFor="category">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Wiki Pages List */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingPages ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredPages.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery || selectedCategory !== "all" 
                      ? "No wiki pages found matching your criteria" 
                      : "No wiki pages available"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPages.map((page) => (
                    <div
                      key={page.id}
                      className="p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700"
                      onClick={() => handleWikiPageSelect(page)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{page.title}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {page.category}
                            </Badge>
                          </div>
                          {page.excerpt && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {page.excerpt}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>By {page.createdBy.name}</span>
                            <span>Updated {formatDate(page.updatedAt)}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(`/wiki/${page.slug}`, '_blank')
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Legacy mode: render with current page display and trigger button
  return (
    <div className="space-y-4">
      {/* Current Wiki Page Display */}
      {currentWikiPage ? (
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">
                {currentWikiPage.title}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Last updated: {formatDate(currentWikiPage.updatedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/wiki/${currentWikiPage.slug}`}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (onWikiPageSelect) {
                  onWikiPageSelect(null)
                }
              }}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Wiki Page Linked
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Link a wiki page to provide project documentation
          </p>
        </div>
      )}

      {/* Wiki Page Selector Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button className="w-full">
              <LinkIcon className="h-4 w-4 mr-2" />
              {currentWikiPage ? 'Change Wiki Page' : 'Link Wiki Page'}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Wiki Page</DialogTitle>
            <DialogDescription>
              Choose a wiki page to link to this project for documentation
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Search and Filter Controls */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search pages</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search wiki pages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-48">
                <Label htmlFor="category">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Wiki Pages List */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingPages ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredPages.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery || selectedCategory !== "all" 
                      ? "No wiki pages found matching your criteria" 
                      : "No wiki pages available"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPages.map((page) => (
                    <div
                      key={page.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        currentWikiPageId === page.id 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                      onClick={() => handleWikiPageSelect(page)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{page.title}</h4>
                            {currentWikiPageId === page.id && (
                              <Badge variant="outline" className="text-blue-600">
                                <Check className="h-3 w-3 mr-1" />
                                Current
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {page.category}
                            </Badge>
                          </div>
                          {page.excerpt && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {page.excerpt}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>By {page.createdBy.name}</span>
                            <span>Updated {formatDate(page.updatedAt)}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(`/wiki/${page.slug}`, '_blank')
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
