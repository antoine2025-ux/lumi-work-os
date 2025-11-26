"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RichTextEditor } from "@/components/wiki/rich-text-editor"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import Link from "next/link"

export default function EditBlogPostPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState<"NEWS" | "PRODUCT" | "CONTEXTUAL_AI" | "LOOPWELL">("NEWS")
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (id) {
      fetchPost()
    }
  }, [id])

  const fetchPost = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/blog/admin/posts/${id}`)
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/blog/dev-login")
          return
        }
        throw new Error("Failed to fetch post")
      }
      const data = await response.json()
      const post = data.post
      setTitle(post.title)
      setSlug(post.slug)
      setExcerpt(post.excerpt)
      setContent(post.content)
      setCategory(post.category || "NEWS")
      setStatus(post.status)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load post")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!title || !slug || !excerpt || !content) {
      setError("Please fill in all fields")
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/blog/admin/posts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          slug,
          excerpt,
          content,
          category,
          status,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/blog/dev-login")
          return
        }
        throw new Error(data.error || "Failed to update post")
      }

      // Redirect to admin list
      router.push("/blog/admin")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update post")
      setSaving(false)
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link href="/blog/admin">
            <Button variant="ghost" className="mb-4 text-slate-300 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
        </div>

        <Card className="shadow-xl bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white">Edit Blog Post</CardTitle>
            <CardDescription className="text-slate-400">
              Update your blog post
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-slate-300">
                  Title *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter post title"
                  className="bg-slate-900 border-slate-700 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug" className="text-slate-300">
                  Slug *
                </Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="post-url-slug"
                  className="bg-slate-900 border-slate-700 text-white font-mono text-sm"
                  required
                />
                <p className="text-xs text-slate-500">
                  Changing the slug will change the post URL
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt" className="text-slate-300">
                  Excerpt *
                </Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Short summary for the blog listing"
                  className="bg-slate-900 border-slate-700 text-white"
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-slate-300">
                  Category *
                </Label>
                <Select value={category} onValueChange={(value: "NEWS" | "PRODUCT" | "CONTEXTUAL_AI" | "LOOPWELL") => setCategory(value)}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEWS">📰 News</SelectItem>
                    <SelectItem value="PRODUCT">📦 Product</SelectItem>
                    <SelectItem value="CONTEXTUAL_AI">🤖 Contextual AI</SelectItem>
                    <SelectItem value="LOOPWELL">🏢 Loopwell</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Select the category so readers can find this post in the blog sidebar
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content" className="text-slate-300">
                  Content *
                </Label>
                <div className="border border-slate-700 rounded-lg bg-slate-900">
                  <RichTextEditor
                    content={content}
                    onChange={setContent}
                    placeholder="Write your blog post content here..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-slate-300">
                  Status *
                </Label>
                <Select value={status} onValueChange={(value: "DRAFT" | "PUBLISHED") => setStatus(value)}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Changing to Published will set the published date if not already set
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Link href="/blog/admin">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

