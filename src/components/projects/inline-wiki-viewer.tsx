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
  Check,
  Edit,
  Maximize2
} from "lucide-react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"

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

interface InlineWikiViewerProps {
  currentWikiPageId?: string
  onWikiPageSelect: (wikiPageId: string | null) => void
  isLoading?: boolean
}

export function InlineWikiViewer({ 
  currentWikiPageId, 
  onWikiPageSelect, 
  isLoading = false 
}: InlineWikiViewerProps) {
  const { currentWorkspace } = useWorkspace()
  const [wikiPages, setWikiPages] = useState<WikiPage[]>([])
  const [currentWikiPage, setCurrentWikiPage] = useState<WikiPage | null>(null)
  const [isLoadingPages, setIsLoadingPages] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isOpen, setIsOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Load wiki pages
  useEffect(() => {
    const loadWikiPages = async () => {
      try {
        setIsLoadingPages(true)
        const response = await fetch(`/api/wiki/pages?workspaceId=${currentWorkspace?.id || 'workspace-1'}`)
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

    if (isOpen) {
      loadWikiPages()
    }
  }, [isOpen])

  // Load current wiki page content
  useEffect(() => {
    const loadCurrentWikiPage = async () => {
      if (currentWikiPageId) {
        try {
          const response = await fetch(`/api/wiki/pages/${currentWikiPageId}`)
          if (response.ok) {
            const data = await response.json()
            setCurrentWikiPage(data)
          }
        } catch (error) {
          console.error('Error loading current wiki page:', error)
        }
      } else {
        setCurrentWikiPage(null)
      }
    }

    loadCurrentWikiPage()
  }, [currentWikiPageId])

  // Filter pages based on search and category
  const filteredPages = Array.isArray(wikiPages) ? wikiPages.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         page.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || page.category === selectedCategory
    return matchesSearch && matchesCategory
  }) : []

  // Get unique categories
  const categories = Array.isArray(wikiPages) ? Array.from(new Set(wikiPages.map(page => page.category))) : []

  const handleWikiPageSelect = (wikiPageId: string | null) => {
    onWikiPageSelect(wikiPageId)
    setIsOpen(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Clean content by removing HTML tags and fixing formatting
  const cleanContent = (content: string) => {
    if (!content) return ''
    
    // Remove HTML tags but preserve line breaks
    let cleaned = content
      .replace(/<div><br><\/div>/g, '\n\n') // Convert div breaks to double line breaks
      .replace(/<br\s*\/?>/g, '\n') // Convert br tags to line breaks
      .replace(/<div>/g, '\n') // Convert div opening to line break
      .replace(/<\/div>/g, '\n') // Convert div closing to line break
      .replace(/<[^>]*>/g, '') // Remove all other HTML tags
      .replace(/\n{3,}/g, '\n\n') // Replace multiple line breaks with double
      .trim()
    
    return cleaned
  }

  return (
    <div className="space-y-2">
      {/* Wiki Page Selector - Cleaner Layout */}
      <div className="space-y-2">
        <div className="flex items-center justify-end">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <LinkIcon className="h-4 w-4 mr-2" />
                Select Page
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Select Wiki Page</DialogTitle>
                <DialogDescription>
                  Choose a wiki page to display as project documentation
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
                          onClick={() => handleWikiPageSelect(page.id)}
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
        
      </div>

      {/* Wiki Content Display */}
      {currentWikiPage ? (
        <div>
          
          {/* Wiki Content - Modern Card Design */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="max-h-96 overflow-y-auto">
              <div className="p-6">
                <div className="max-w-none prose prose-gray">
                  <div style={{ color: '#111827 !important' }}>
                    <ReactMarkdown 
                      components={{
                        // Custom components to handle HTML tags properly
                        p: ({ children }) => <p className="mb-4 leading-relaxed text-base" style={{ color: '#111827 !important' }}>{children}</p>,
                        ul: ({ children }) => <ul className="mb-6 pl-6 space-y-2">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-6 pl-6 space-y-2">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed text-base" style={{ color: '#111827 !important' }}>{children}</li>,
                        h1: ({ children }) => <h1 className="text-2xl font-bold mb-6 mt-8 border-b-2 border-gray-300 pb-3" style={{ color: '#111827 !important' }}>{children}</h1>,
                        h2: ({ children }) => <h2 className="text-xl font-bold mb-4 mt-8" style={{ color: '#111827 !important' }}>{children}</h2>,
                        h3: ({ children }) => <h3 className="text-lg font-bold mb-3 mt-6" style={{ color: '#374151 !important' }}>{children}</h3>,
                        strong: ({ children }) => <strong className="font-bold" style={{ color: '#111827 !important' }}>{children}</strong>,
                        em: ({ children }) => <em className="italic" style={{ color: '#374151 !important' }}>{children}</em>,
                        code: ({ children }) => <code className="bg-blue-50 px-2 py-1 rounded text-sm font-mono font-semibold" style={{ color: '#1d4ed8 !important' }}>{children}</code>,
                        pre: ({ children }) => <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 my-6 overflow-x-auto">{children}</pre>,
                        blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-300 pl-4 italic my-6" style={{ color: '#374151 !important' }}>{children}</blockquote>,
                        hr: () => <hr className="my-8 border-gray-300" />
                      }}
                    >
                      {cleanContent(currentWikiPage.content)}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-col items-center">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full mb-3">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Page Selected
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md text-sm">
              Select a wiki page to display project documentation inline.
            </p>
          </div>
        </div>
      )}

      {/* Fullscreen Modal */}
      {isFullscreen && currentWikiPage && (
        <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{currentWikiPage.title}</DialogTitle>
              <DialogDescription>
                Last updated: {formatDate(currentWikiPage.updatedAt)} • By {currentWikiPage.createdBy.name}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-none">
                <div className="text-gray-900 dark:text-gray-100" style={{ color: '#111827 !important' }}>
                  <ReactMarkdown 
                    components={{
                      // Custom components to handle HTML tags properly
                      p: ({ children }) => <p className="mb-4 leading-relaxed text-base" style={{ color: '#111827' }}>{children}</p>,
                      ul: ({ children }) => <ul className="mb-6 pl-6 space-y-2">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-6 pl-6 space-y-2">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed text-base" style={{ color: '#111827' }}>{children}</li>,
                      h1: ({ children }) => <h1 className="text-3xl font-bold mb-6 mt-8 border-b-2 border-gray-300 dark:border-gray-600 pb-3" style={{ color: '#111827' }}>{children}</h1>,
                      h2: ({ children }) => <h2 className="text-2xl font-bold mb-4 mt-8" style={{ color: '#111827' }}>{children}</h2>,
                      h3: ({ children }) => <h3 className="text-xl font-bold mb-3 mt-6" style={{ color: '#374151' }}>{children}</h3>,
                      strong: ({ children }) => <strong className="font-bold" style={{ color: '#111827' }}>{children}</strong>,
                      em: ({ children }) => <em className="italic" style={{ color: '#374151' }}>{children}</em>,
                      code: ({ children }) => <code className="bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded text-sm font-mono font-semibold" style={{ color: '#1d4ed8' }}>{children}</code>,
                      pre: ({ children }) => <pre className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 my-6 overflow-x-auto">{children}</pre>,
                      blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-300 dark:border-blue-400 pl-4 italic my-6" style={{ color: '#374151' }}>{children}</blockquote>,
                      hr: () => <hr className="my-8 border-gray-300 dark:border-gray-600" />
                    }}
                  >
                    {cleanContent(currentWikiPage.content)}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
