"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WikiEditorShell } from "@/components/wiki/wiki-editor-shell"
import {
  Save,
  X,
  Loader2,
  Settings,
  Download,
  FileText,
  MoreHorizontal
} from "lucide-react"
import { useRouter } from "next/navigation"
import { JSONContent, Editor } from '@tiptap/core'
import { createWikiPage } from '@/lib/wiki/create-page'
import { useUserStatusContext } from '@/providers/user-status-provider'

export default function NewWikiPage() {
  const router = useRouter()
  const { workspaceId } = useUserStatusContext()
  const [isSaving, setIsSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [category] = useState("general")
  const [error, setError] = useState<string | null>(null)
  const [pageCreated, setPageCreated] = useState(false)
  const editorRef = useRef<Editor | null>(null)

  const initialContent: JSONContent = {
    type: 'doc',
    content: [{ type: 'paragraph' }],
  }

  const handleSave = async (jsonContent: JSONContent) => {
    if (pageCreated) return // Prevent double-creation
    if (!title.trim()) {
      setError("Please enter a title")
      return
    }

    try {
      setIsSaving(true)
      setPageCreated(true)
      setError(null)

      const newPage = await createWikiPage({
        workspaceId: workspaceId || '',
        title: title.trim(),
        contentJson: jsonContent,
        tags: [],
        category
      })

      router.push(`/wiki/${newPage.slug}?edit=true`)
    } catch (err) {
      console.error('Error creating page:', err)
      setPageCreated(false)
      setError(err instanceof Error ? err.message : 'Failed to create page. Please try again.')
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateClick = async () => {
    if (!title.trim()) {
      setError("Please enter a title")
      return
    }

    // Read live content from the editor (not stale parent state)
    const liveContent = editorRef.current
      ? editorRef.current.getJSON()
      : initialContent

    await handleSave(liveContent)
  }

  const handleCancel = () => {
    router.push('/wiki')
  }

  return (
    <div className="h-full bg-background min-h-screen w-full min-w-0 relative">
      {/* Floating Vertical Sidebar - Right Side (matches [slug] edit mode) */}
      <div className="fixed top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 right-8">
        <Button
          onClick={handleCreateClick}
          disabled={isSaving || !title.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed w-10 h-10 rounded-full flex items-center justify-center p-0"
          title={isSaving ? 'Creating...' : 'Create Page'}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
        </Button>
        <Button
          onClick={handleCancel}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground w-10 h-10 rounded-full flex items-center justify-center p-0 bg-card/80 backdrop-blur-sm border border-border shadow-sm"
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background min-h-screen overflow-x-hidden w-full min-w-0">
        <div className="max-w-4xl mx-auto w-full min-w-0">
          {/* Page Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 w-full min-w-0">
            <div className="text-sm text-muted-foreground">
              New document
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Title Input */}
          <div className="mb-8">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-4xl font-bold border-none p-0 h-auto focus:ring-0 focus:outline-none focus:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder-muted-foreground bg-transparent text-foreground"
              placeholder="Give your doc a title"
              autoFocus
            />
          </div>

          {/* Content Editor */}
          <div className="min-h-[400px]">
            <WikiEditorShell
              initialContent={initialContent}
              onSave={handleSave}
              placeholder="Start writing your page content..."
              className="min-h-[400px] border-none shadow-none bg-transparent"
              onEditorReady={(editor) => {
                editorRef.current = editor
              }}
            />

            {/* Action Suggestions */}
            <div className="flex items-center gap-3 sm:gap-6 text-sm text-muted-foreground mt-8 flex-wrap overflow-x-auto w-full">
              <button className="flex items-center gap-2 hover:text-foreground whitespace-nowrap">
                <Settings className="h-4 w-4 flex-shrink-0" />
                Use a template
              </button>
              <button className="flex items-center gap-2 hover:text-foreground whitespace-nowrap">
                <Download className="h-4 w-4 flex-shrink-0" />
                Import
              </button>
              <button className="flex items-center gap-2 hover:text-foreground whitespace-nowrap">
                <FileText className="h-4 w-4 flex-shrink-0" />
                New subdoc
              </button>
              <button className="flex items-center gap-2 hover:text-foreground whitespace-nowrap">
                <MoreHorizontal className="h-4 w-4 flex-shrink-0" />
                Convert to collection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
