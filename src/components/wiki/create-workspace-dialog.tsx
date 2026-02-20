"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Lock, Users, Globe } from "lucide-react"
import { useWorkspace } from "@/lib/workspace-context"
import { MemberPicker } from "@/components/workspace/member-picker"

export interface CreateWorkspaceDialogProps {
  open: boolean
  onClose: () => void
  onCreated?: (workspace: { id: string; name: string }) => void
}

export function CreateWorkspaceDialog({
  open,
  onClose,
  onCreated,
}: CreateWorkspaceDialogProps) {
  const router = useRouter()
  const { currentWorkspace } = useWorkspace()
  const [newWorkspaceName, setNewWorkspaceName] = useState("")
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("")
  const [visibility, setVisibility] = useState<"PERSONAL" | "PRIVATE" | "PUBLIC">("PUBLIC")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      setError("Workspace name is required")
      return
    }

    try {
      setIsSavingWorkspace(true)
      setError(null)

      const response = await fetch("/api/wiki/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newWorkspaceName.trim(),
          description: newWorkspaceDescription.trim(),
          visibility,
          memberIds: visibility === "PRIVATE" ? selectedMembers : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create workspace")
      }

      const newWorkspace = await response.json()

      onClose()
      setNewWorkspaceName("")
      setNewWorkspaceDescription("")
      setVisibility("PUBLIC")
      setSelectedMembers([])

      if (onCreated) {
        onCreated(newWorkspace)
      } else {
        router.push(`/wiki/workspace/${newWorkspace.id}`)
      }
    } catch (err) {
      console.error("Error creating workspace:", err)
      setError(err instanceof Error ? err.message : "Failed to create workspace")
    } finally {
      setIsSavingWorkspace(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose()
      setError(null)
      setNewWorkspaceName("")
      setNewWorkspaceDescription("")
      setVisibility("PUBLIC")
      setSelectedMembers([])
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription>
            Create a custom workspace to organize your wiki pages
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="workspace-name">Workspace Name</Label>
            <Input
              id="workspace-name"
              placeholder="e.g., Project Documentation"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="workspace-description">Description (Optional)</Label>
            <Textarea
              id="workspace-description"
              placeholder="Brief description of this workspace's purpose"
              value={newWorkspaceDescription}
              onChange={(e) => setNewWorkspaceDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label>Privacy Level</Label>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as "PERSONAL" | "PRIVATE" | "PUBLIC")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERSONAL">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Personal</div>
                      <div className="text-xs text-muted-foreground">
                        Only you can see this
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="PRIVATE">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Private</div>
                      <div className="text-xs text-muted-foreground">
                        Invite specific people
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="PUBLIC">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Public</div>
                      <div className="text-xs text-muted-foreground">
                        Everyone in workspace can see
                      </div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visibility === "PRIVATE" && (
            <div className="grid gap-2">
              <Label>Invite Members</Label>
              <MemberPicker
                selectedMembers={selectedMembers}
                onMembersChange={setSelectedMembers}
                workspaceId={currentWorkspace?.id ?? ""}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateWorkspace}
            disabled={isSavingWorkspace || !newWorkspaceName.trim()}
          >
            {isSavingWorkspace ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Workspace"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
