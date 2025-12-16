"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RichTextEditor } from "@/components/wiki/rich-text-editor"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText, Edit2 } from "lucide-react"
import ReactMarkdown from "react-markdown"

interface WikiWorkspace {
  id: string
  name: string
  description?: string
  type: 'personal' | 'team' | 'project'
  color?: string
  icon?: string
}

interface AIPagePreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  content: string
  workspaces: WikiWorkspace[]
  onSave: (title: string, content: string, workspaceId: string) => Promise<void>
  isSaving?: boolean
}

export function AIPagePreviewModal({
  open,
  onOpenChange,
  title: initialTitle,
  content: initialContent,
  workspaces,
  onSave,
  isSaving = false
}: AIPagePreviewModalProps) {
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("")
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens/closes or initial values change
  useEffect(() => {
    if (open) {
      setTitle(initialTitle)
      setContent(initialContent)
      setSelectedWorkspaceId("")
      setIsEditing(false)
      setError(null)
      console.log('📋 AIPagePreviewModal opened with workspaces:', workspaces.length, workspaces)
    }
  }, [open, initialTitle, initialContent, workspaces])

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Please enter a title")
      return
    }
    if (!selectedWorkspaceId) {
      setError("Please select a workspace")
      return
    }
    
    setError(null)
    try {
      await onSave(title.trim(), content, selectedWorkspaceId)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create page")
    }
  }

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto" 
        onInteractOutside={(e) => {
          // Prevent closing when clicking on Select dropdown
          const target = e.target as HTMLElement
          if (target.closest('[role="listbox"]') || target.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault()
          }
        }}
        onEscapeKeyDown={(e) => {
          // Allow escape to close, but not when Select is open
          // This is handled by Select itself
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Preview & Create Page
          </DialogTitle>
          <DialogDescription>
            Review and edit the page content, then select a workspace to create it in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="page-title">Page Title</Label>
            <Input
              id="page-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter page title..."
              className="text-lg font-semibold"
            />
          </div>

          {/* Edit/Preview Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                {isEditing ? "Preview Mode" : "Edit Mode"}
              </Button>
              {!isEditing && (
                <Badge variant="secondary" className="text-xs">
                  Preview
                </Badge>
              )}
            </div>
          </div>

          {/* Content Editor/Preview */}
          <div className="border rounded-lg min-h-[400px]">
            {isEditing ? (
              <div className="p-4">
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Edit page content..."
                  className="min-h-[400px]"
                  showToolbar={true}
                />
              </div>
            ) : (
              <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{content || "*No content yet*"}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* Workspace Selection */}
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="workspace-select">Select Workspace</Label>
            {workspaces.length > 0 ? (
              <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                <SelectTrigger id="workspace-select" className="w-full">
                  <SelectValue placeholder="Choose a workspace for this page" />
                </SelectTrigger>
                <SelectContent 
                  className="z-[100]" 
                  position="popper"
                  sideOffset={4}
                  style={{ zIndex: 100 }}
                >
                  {workspaces.map((workspace) => (
                    <SelectItem 
                      key={workspace.id} 
                      value={workspace.id}
                      className="cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        {workspace.color && (
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0 inline-block"
                            style={{ backgroundColor: workspace.color }}
                          />
                        )}
                        <span className="flex-1">{workspace.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {workspace.type}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="p-3 border rounded-md bg-muted">
                <p className="text-sm text-muted-foreground">
                  No workspaces available. Please create a workspace first.
                </p>
              </div>
            )}
            {selectedWorkspace && (
              <p className="text-sm text-muted-foreground">
                This page will be created in <strong>{selectedWorkspace.name}</strong>
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !title.trim() || !selectedWorkspaceId}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Create Page
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

