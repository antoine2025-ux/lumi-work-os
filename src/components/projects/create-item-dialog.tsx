"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { 
  CheckSquare, 
  FolderKanban,
  ArrowRight
} from "lucide-react"

interface CreateItemDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreateTask: () => void
  onCreateEpic: () => void
}

export function CreateItemDialog({ 
  isOpen, 
  onClose, 
  onCreateTask, 
  onCreateEpic 
}: CreateItemDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Item</DialogTitle>
          <DialogDescription>
            Choose what you'd like to create for this project
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-3 py-4">
          <Button
            variant="outline"
            className="h-auto py-6 px-6 flex flex-col items-start space-y-2 hover:bg-accent transition-colors"
            onClick={() => {
              onCreateTask()
              onClose()
            }}
          >
            <div className="flex items-center space-x-3 w-full">
              <CheckSquare className="h-6 w-6 text-primary" />
              <div className="flex-1 text-left">
                <div className="font-semibold">Create Task</div>
                <div className="text-sm text-muted-foreground">
                  Add a new task directly to the Kanban board
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="h-auto py-6 px-6 flex flex-col items-start space-y-2 hover:bg-accent transition-colors"
            onClick={() => {
              onCreateEpic()
              onClose()
            }}
          >
            <div className="flex items-center space-x-3 w-full">
              <FolderKanban className="h-6 w-6 text-primary" />
              <div className="flex-1 text-left">
                <div className="font-semibold">Create Epic</div>
                <div className="text-sm text-muted-foreground">
                  Organize tasks into major workstreams
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


