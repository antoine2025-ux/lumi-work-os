"use client"

import { useState, useEffect } from "react"
import { Search, Clock, User, Tag, FileText } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import Link from "next/link"

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

interface WikiSearchProps {
  placeholder?: string
  onResultClick?: (result: SearchResult) => void
  className?: string
}

export function WikiSearch({ placeholder = "Search wiki...", onResultClick, className = "" }: WikiSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // Perform search
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        workspaceId: 'workspace-1', // TODO: Get from context/session
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

      setResults(transformedResults)
      setShowResults(true)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
      setShowResults(false)
    } finally {
      setIsSearching(false)
    }
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      performSearch(value)
    }, 300)

    return () => clearTimeout(timeoutId)
  }

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    setShowResults(false)
    if (onResultClick) {
      onResultClick(result)
    }
  }

  // Highlight search terms
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm) return text
    const regex = new RegExp(`(${searchTerm})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>')
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          className="pl-10 pr-4"
          onFocus={() => query && setShowResults(true)}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          {query && results.length > 0 ? (
            <div className="p-2">
              <div className="text-xs text-muted-foreground mb-2 px-2">
                {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
              </div>
              {results.slice(0, 5).map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="p-2 hover:bg-muted rounded cursor-pointer"
                >
                  <div className="flex items-start space-x-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{result.title}</div>
                      <div 
                        className="text-xs text-muted-foreground mt-1 line-clamp-2"
                        dangerouslySetInnerHTML={{ 
                          __html: highlightText(result.excerpt, query) 
                        }}
                      />
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{result.author}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{result.updatedAt}</span>
                        </div>
                      </div>
                      {result.tags.length > 0 && (
                        <div className="flex items-center space-x-1 mt-1">
                          {result.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {results.length > 5 && (
                <div className="text-xs text-muted-foreground text-center py-2 border-t">
                  And {results.length - 5} more results...
                </div>
              )}
            </div>
          ) : query && results.length === 0 && !isSearching ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : null}
        </div>
      )}

      {/* Click outside to close */}
      {showResults && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  )
}
