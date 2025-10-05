"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { WikiNavigation } from "@/components/wiki/wiki-navigation"
import { RichTextEditor } from "@/components/wiki/rich-text-editor"
import { 
  ArrowLeft,
  Save,
  X,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function NewWikiPage() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("general")

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert("Please enter both title and content")
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch('/api/wiki/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId: 'workspace-1', // TODO: Get from context/session
          title: title.trim(),
          content: content.trim(),
          tags: [],
          category: category
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(`Failed to create page: ${errorData.error || 'Unknown error'}`)
      }

      const newPage = await response.json()
      router.push(`/wiki/${newPage.slug}`)
    } catch (error) {
      console.error('Error creating page:', error)
      alert('Failed to create page. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    router.push('/wiki')
  }

  return (
    <div className="flex h-full">
      {/* Wiki Navigation Sidebar */}
      <WikiNavigation currentPath="/wiki/new" />
      
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
              <h1 className="text-3xl font-bold">New Wiki Page</h1>
              <p className="text-muted-foreground">
                Create a new page in your knowledge base
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleCancel} variant="outline" disabled={isSaving}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !title.trim() || !content.trim()}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isSaving ? 'Creating...' : 'Create Page'}
            </Button>
          </div>
        </div>

        {/* Page Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-2xl font-bold border-none p-0 h-auto"
                  placeholder="Page title..."
                />
              </CardHeader>
              <CardContent>
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Start writing your page content..."
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Page Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Page Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div>
                    <label className="text-muted-foreground">Status</label>
                    <Badge className="ml-2">Draft</Badge>
                  </div>
                  <div>
                    <label className="text-muted-foreground">Visibility</label>
                    <Badge variant="secondary" className="ml-2">Private</Badge>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-muted-foreground">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="engineering">Engineering</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Use clear, descriptive titles</p>
                  <p>• Add tags to help with organization</p>
                  <p>• Include an introduction paragraph</p>
                  <p>• Use headings to structure content</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
