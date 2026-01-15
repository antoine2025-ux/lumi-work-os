"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { WikiNavigation } from "@/components/wiki/wiki-navigation"
import { WikiEditorShell } from "@/components/wiki/wiki-editor-shell"
import { 
  ArrowLeft,
  X,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { JSONContent } from '@tiptap/core'
import { createWikiPage } from '@/lib/wiki/create-page'
import { useUserStatusContext } from '@/providers/user-status-provider'

export default function NewWikiPage() {
  const router = useRouter()
  // Use centralized UserStatusContext - no separate API call needed
  const { workspaceId } = useUserStatusContext()
  const [isSaving, setIsSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [contentJson, setContentJson] = useState<JSONContent | null>({
    type: 'doc',
    content: [{ type: 'paragraph' }],
  })
  const [category, setCategory] = useState("general")
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (jsonContent: JSONContent) => {
    if (!title.trim()) {
      setError("Please enter a title")
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      
      // Use centralized helper to create page
      const newPage = await createWikiPage({
        workspaceId: workspaceId || '',
        title: title.trim(),
        contentJson: jsonContent,
        tags: [],
        category
      })

      // Redirect to edit mode so content persists immediately
      router.push(`/wiki/${newPage.slug}?edit=1`)
    } catch (error) {
      console.error('Error creating page:', error)
      setError(error instanceof Error ? error.message : 'Failed to create page. Please try again.')
      throw error // Re-throw for autosave error handling
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
            <Button 
              onClick={() => contentJson && handleSave(contentJson)} 
              disabled={isSaving || !title.trim()}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isSaving ? 'Creating...' : 'Create Page'}
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <X className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
              <p className="text-red-800 dark:text-red-200 font-medium">Error</p>
            </div>
            <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        )}

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
                <WikiEditorShell
                  initialContent={contentJson}
                  onSave={handleSave}
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
