"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Plus, Edit, Eye, Trash2, Loader2 } from "lucide-react"
import { RichTextEditor } from "@/components/wiki/rich-text-editor"

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  status: "DRAFT" | "PUBLISHED"
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export default function BlogAdminPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/blog/admin/posts")
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/blog/dev-login")
          return
        }
        throw new Error("Failed to fetch posts")
      }
      const data = await response.json()
      setPosts(data.posts)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) {
      return
    }

    try {
      const response = await fetch(`/api/blog/admin/posts/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete post")
      }

      // Refresh list
      fetchPosts()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete post")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Blog Admin</h1>
            <p className="text-slate-400">Manage your blog posts</p>
          </div>
          <Link href="/blog/admin/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Button>
          </Link>
        </div>

        {error && (
          <Card className="mb-6 bg-red-500/10 border-red-500/20">
            <CardContent className="p-4">
              <p className="text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {posts.length === 0 ? (
          <Card className="shadow-xl bg-slate-800/50 border-slate-700">
            <CardContent className="p-12 text-center">
              <p className="text-slate-400 text-lg mb-4">No blog posts yet.</p>
              <Link href="/blog/admin/new">
                <Button>Create Your First Post</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card
                key={post.id}
                className="shadow-xl bg-slate-800/50 border-slate-700"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl font-bold text-white">
                          {post.title}
                        </CardTitle>
                        <Badge
                          variant={
                            post.status === "PUBLISHED" ? "default" : "secondary"
                          }
                        >
                          {post.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-slate-300">
                        {post.excerpt}
                      </CardDescription>
                      <div className="flex items-center gap-4 mt-4 text-sm text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Updated:{" "}
                            {new Date(post.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {post.publishedAt && (
                          <div className="flex items-center gap-1">
                            <span>Published: </span>
                            <span>
                              {new Date(post.publishedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {post.status === "PUBLISHED" && (
                        <Link href={`/blog/${post.slug}`} target="_blank">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      )}
                      <Link href={`/blog/admin/${post.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(post.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

