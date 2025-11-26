"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, BookOpen, Sparkles, ArrowRight, Search, Newspaper, Package, Brain, Building2, Loader2 } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  category: "NEWS" | "PRODUCT" | "CONTEXTUAL_AI" | "LOOPWELL"
  publishedAt: string | null
}

const CATEGORIES = [
  { value: "all", label: "All Posts", icon: BookOpen },
  { value: "NEWS", label: "News", icon: Newspaper },
  { value: "PRODUCT", label: "Product", icon: Package },
  { value: "CONTEXTUAL_AI", label: "Contextual AI", icon: Brain },
  { value: "LOOPWELL", label: "Loopwell", icon: Building2 },
] as const

function BlogPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const selectedCategory = searchParams.get("category") || "all"

  useEffect(() => {
    async function fetchPosts() {
      try {
        const response = await fetch("/api/blog/posts")
        if (response.ok) {
          const data = await response.json()
          console.log("[Blog] Fetched posts:", data.posts?.length || 0)
          setPosts(data.posts || [])
        } else {
          const errorData = await response.json()
          console.error("[Blog] API error:", errorData)
        }
      } catch (error) {
        console.error("[Blog] Error fetching posts:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [])

  // Filter posts by category and search
  const filteredPosts = useMemo(() => {
    let filtered = posts

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((post) => post.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.excerpt.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [posts, selectedCategory, searchQuery])

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (category === "all") {
      params.delete("category")
    } else {
      params.set("category", category)
    }
    router.push(`/blog?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header Section */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <div className="sticky top-24">
              <Card className="shadow-xl bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                    Categories
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {CATEGORIES.map((category) => {
                    const Icon = category.icon
                    const isActive = selectedCategory === category.value
                    return (
                      <button
                        key={category.value}
                        onClick={() => handleCategoryChange(category.value)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                          isActive
                            ? "bg-blue-500/20 border border-blue-500/50 text-white"
                            : "text-slate-300 hover:bg-slate-700/50 hover:text-white border border-transparent"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                        <span className="font-medium">{category.label}</span>
                      </button>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Search Bar */}
            <div className="mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search blog posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500/50"
                />
              </div>
            </div>

            {/* Mobile Category Filter */}
            <div className="lg:hidden mb-6">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {CATEGORIES.map((category) => {
                  const Icon = category.icon
                  const isActive = selectedCategory === category.value
                  return (
                    <button
                      key={category.value}
                      onClick={() => handleCategoryChange(category.value)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                        isActive
                          ? "bg-blue-500/20 border border-blue-500/50 text-white"
                          : "bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-700/50"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                      <span className="text-sm font-medium">{category.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Results Count */}
            {filteredPosts.length > 0 && (
              <div className="mb-6 text-slate-400 text-sm">
                {filteredPosts.length} {filteredPosts.length === 1 ? "post" : "posts"} found
                {selectedCategory !== "all" && ` in ${CATEGORIES.find((c) => c.value === selectedCategory)?.label}`}
                {searchQuery && ` matching "${searchQuery}"`}
              </div>
            )}

            {/* Posts Grid */}
            {loading ? (
              <Card className="shadow-xl bg-slate-800/50 border-slate-700">
                <CardContent className="p-16 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-700/50 mb-6">
                    <Sparkles className="w-8 h-8 text-slate-400 animate-pulse" />
                  </div>
                  <p className="text-slate-400 text-lg">Loading posts...</p>
                </CardContent>
              </Card>
            ) : filteredPosts.length === 0 ? (
              <Card className="shadow-xl bg-slate-800/50 border-slate-700">
                <CardContent className="p-16 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-700/50 mb-6">
                    <Sparkles className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-2">
                    {searchQuery ? "No posts found" : "Coming Soon"}
                  </h3>
                  <p className="text-slate-400 text-lg">
                    {searchQuery
                      ? "Try a different search term or category"
                      : "We're working on some great content. Check back soon!"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredPosts.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`}>
                    <Card className="group h-full shadow-xl bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-blue-500/10">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant="outline"
                                className="text-xs border-slate-600 text-slate-400"
                              >
                                {CATEGORIES.find((c) => c.value === post.category)?.label || post.category}
                              </Badge>
                            </div>
                            <CardTitle className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                              {post.title}
                            </CardTitle>
                          </div>
                          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
                        </div>
                        <CardDescription className="text-slate-300 line-clamp-3">
                          {post.excerpt}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {post.publishedAt && (
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Calendar className="w-4 h-4" />
                            <time dateTime={post.publishedAt}>
                              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </time>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default function BlogPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-slate-400">Loading blog...</p>
          </div>
        </div>
      }
    >
      <BlogPageContent />
    </Suspense>
  )
}
