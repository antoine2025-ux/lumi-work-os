"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText } from "lucide-react"

interface WikiWorkspace {
  id: string
  name: string
  description?: string
  type: 'personal' | 'team' | 'project'
  color?: string
  icon?: string
}

interface AIWorkspaceSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  workspaces: WikiWorkspace[]
  onSelect: (workspaceId: string) => Promise<void>
  isCreating?: boolean
}

export function AIWorkspaceSelectDialog({
  open,
  onOpenChange,
  title,
  workspaces,
  onSelect,
  isCreating = false
}: AIWorkspaceSelectDialogProps) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!selectedWorkspaceId) {
      setError("Please select a workspace")
      return
    }
    
    setError(null)
    try {
      await onSelect(selectedWorkspaceId)
      onOpenChange(false)
      setSelectedWorkspaceId("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create page")
    }
  }

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-md" 
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement
          if (target.closest('[role="listbox"]') || target.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-light text-2xl">Create New Page</DialogTitle>
          <DialogDescription className="text-base font-light">
            Select where to create "{title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Workspace Selection */}
          <div className="space-y-2">
            <Label htmlFor="workspace-select" className="font-light">Workspace</Label>
            {workspaces.length > 0 ? (
              <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                <SelectTrigger id="workspace-select" className="w-full">
                  <SelectValue placeholder="Choose a workspace" />
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
                        <span className="flex-1 font-light">{workspace.name}</span>
                        <Badge variant="outline" className="text-xs font-light">
                          {workspace.type}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="p-3 border rounded-md bg-muted">
                <p className="text-sm text-muted-foreground font-light">
                  No workspaces available. Please create a workspace first.
                </p>
              </div>
            )}
            {selectedWorkspace && (
              <p className="text-sm text-muted-foreground font-light">
                This page will be created in <span className="font-normal">{selectedWorkspace.name}</span>
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
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isCreating}
            className="font-light"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !selectedWorkspaceId}
            className="bg-purple-600 hover:bg-purple-700 font-light"
          >
            {isCreating ? (
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



