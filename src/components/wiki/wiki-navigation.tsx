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
  Star
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
}

export function WikiNavigation({ currentPath }: WikiNavigationProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [wikiPages, setWikiPages] = useState<WikiPage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Fetch wiki pages from API
  useEffect(() => {
    const fetchPages = async () => {
      try {
        const response = await fetch('/api/wiki/pages?workspaceId=workspace-1')
        if (response.ok) {
          const data = await response.json()
          console.log('📄 Wiki Navigation - Fetched pages:', data)
          setWikiPages(data || [])
        }
      } catch (error) {
        console.error('Error fetching wiki pages:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPages()
  }, [])

  // Create navigation structure from real pages
  const createNavigationStructure = () => {
    const homePage = {
      id: "home",
      title: "Home",
      type: "page" as const,
      href: "/wiki",
      isStarred: true
    }

    // Show all pages individually for now (simpler approach)
    const allPages = wikiPages.map(page => ({
      id: page.id,
      title: page.title,
      type: "page" as const,
      href: `/wiki/${page.slug}`
    }))

    return [homePage, ...allPages]
  }

  const wikiStructure = createNavigationStructure()

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const handleNewPage = () => {
    router.push('/wiki/new')
  }

  const renderNode = (node: any, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.id)
    const isActive = currentPath === node.href
    const hasChildren = node.children && node.children.length > 0

    if (node.type === "folder") {
      return (
        <div key={node.id}>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start h-8 px-2 text-sm font-normal",
              level > 0 && "ml-4"
            )}
            onClick={() => toggleFolder(node.id)}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 mr-2" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2" />
              )
            ) : (
              <div className="w-4 mr-2" />
            )}
            <Folder className="h-4 w-4 mr-2" />
            <span className="flex-1 text-left">{node.title}</span>
          </Button>
          {hasChildren && isExpanded && (
            <div className="ml-2">
              {node.children!.map((child) => renderNode(child, level + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link key={node.id} href={node.href || "#"}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start h-8 px-2 text-sm font-normal",
            level > 0 && "ml-4",
            isActive && "bg-accent text-accent-foreground"
          )}
        >
          <div className="w-4 mr-2" />
          <FileText className="h-4 w-4 mr-2" />
          <span className="flex-1 text-left">{node.title}</span>
          {node.isStarred && (
            <Star className="h-3 w-3 ml-2 text-yellow-500 fill-current" />
          )}
        </Button>
      </Link>
    )
  }

  const filteredStructure = wikiStructure.filter(node => {
    if (searchQuery === "") return true
    
    const matchesNode = node.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesChildren = node.children?.some(child => 
      child.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    
    return matchesNode || matchesChildren
  })

  return (
    <div className="w-64 bg-card border-r h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center space-x-2 mb-4">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Wiki</h2>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-8"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredStructure.map((node) => renderNode(node))}
            {filteredStructure.length === 1 && wikiPages.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No pages yet</p>
                <p className="text-xs">Create your first page!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button className="w-full" size="sm" onClick={handleNewPage}>
          <Plus className="h-4 w-4 mr-2" />
          New Page
        </Button>
      </div>
    </div>
  )
}

