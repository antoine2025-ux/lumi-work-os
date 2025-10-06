"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WikiNavigation } from "@/components/wiki/wiki-navigation"
import { WikiSearch } from "@/components/wiki/wiki-search"
import { 
  Search, 
  Filter, 
  Clock, 
  User, 
  Tag, 
  FileText, 
  FolderOpen,
  ArrowLeft,
  SortAsc,
  SortDesc
} from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

interface SearchResult {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  type: "page" | "folder"
  tags: string[]
  author: string
  updatedAt: string
  path: string[]
}

export default function WikiSearchPage() {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'title'>('relevance')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filters, setFilters] = useState({
    type: 'all' as 'all' | 'page' | 'folder',
    author: '',
    tags: [] as string[]
  })

  // Perform search
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        workspaceId: 'workspace-1', // TODO: Get from context/session
        type: filters.type,
        ...(filters.author && { author: filters.author }),
        ...(filters.tags.length > 0 && { tags: filters.tags.join(',') })
      })

      const response = await fetch(`/api/wiki/search?${params}`)
      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      
      // Transform API response to match expected format
      const transformedResults = data.results.map((page: any) => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        excerpt: page.excerpt,
        content: page.content,
        type: "page" as const,
        tags: page.tags,
        author: page.createdBy.name,
        updatedAt: new Date(page.updatedAt).toLocaleDateString(),
        path: page.parent ? [page.parent.title, page.title] : [page.title]
      }))

      // Apply client-side sorting
      transformedResults.sort((a, b) => {
        switch (sortBy) {
          case 'title':
            return sortOrder === 'asc' 
              ? a.title.localeCompare(b.title)
              : b.title.localeCompare(a.title)
          case 'date':
            return sortOrder === 'asc'
              ? new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
              : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          case 'relevance':
          default:
            // Use server-side relevance score
            const aScore = data.results.find((r: any) => r.id === a.id)?.relevanceScore || 0
            const bScore = data.results.find((r: any) => r.id === b.id)?.relevanceScore || 0
            return sortOrder === 'asc' ? aScore - bScore : bScore - aScore
        }
      })

      setResults(transformedResults)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Handle search
  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery)
    performSearch(searchQuery)
  }

  // Highlight search terms
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm) return text
    const regex = new RegExp(`(${searchTerm})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>')
  }

  // Get all unique tags and authors from results
  const allTags = Array.from(new Set(results.flatMap(page => page.tags)))
  const allAuthors = Array.from(new Set(results.map(page => page.author)))

  // Initial search on mount
  useEffect(() => {
    if (query) {
      performSearch(query)
    }
  }, [query, sortBy, sortOrder, filters])

  return (
    <div className="flex h-full">
      {/* Wiki Navigation Sidebar */}
      <WikiNavigation />
      
      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/wiki">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Search Wiki</h1>
              <p className="text-muted-foreground">
                Find content across your knowledge base
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl">
          <WikiSearch 
            placeholder="Search all wiki content..."
            onResultClick={(result) => {
              window.location.href = `/wiki/${result.slug}`
            }}
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value as any})}
              className="text-sm border border-border rounded px-2 py-1"
            >
              <option value="all">All Types</option>
              <option value="page">Pages Only</option>
              <option value="folder">Folders Only</option>
            </select>

            <select
              value={filters.author}
              onChange={(e) => setFilters({...filters, author: e.target.value})}
              className="text-sm border border-border rounded px-2 py-1"
            >
              <option value="">All Authors</option>
              {allAuthors.map(author => (
                <option key={author} value={author}>{author}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-border rounded px-2 py-1"
            >
              <option value="relevance">Relevance</option>
              <option value="date">Date</option>
              <option value="title">Title</option>
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Search Results */}
        <div className="space-y-4">
          {isSearching ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Searching...</p>
            </div>
          ) : query && results.length > 0 ? (
            <>
              <div className="text-sm text-muted-foreground">
                {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
              </div>
              {results.map((result) => (
                <Link key={result.id} href={`/wiki/${result.slug}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center space-x-2">
                            {result.type === "folder" ? (
                              <FolderOpen className="h-5 w-5 text-primary" />
                            ) : (
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            )}
                            <span>{result.title}</span>
                          </CardTitle>
                          <CardDescription 
                            className="mt-2"
                            dangerouslySetInnerHTML={{ 
                              __html: highlightText(result.excerpt, query) 
                            }}
                          />
                          <div className="flex items-center space-x-4 mt-3 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <User className="h-4 w-4" />
                              <span>{result.author}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{result.updatedAt}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 mt-3">
                            {result.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </>
          ) : query && results.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground mb-4">
                  No pages match your search for "{query}"
                </p>
                <p className="text-sm text-muted-foreground">
                  Try different keywords or check your spelling
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Search your wiki</h3>
                <p className="text-muted-foreground mb-4">
                  Enter a search term above to find content across your knowledge base
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}



