"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Calendar, User } from "lucide-react"

interface FabAddTaskProps {
  colors: {
    background: string
    surface: string
    surfaceElevated: string
    text: string
    textSecondary: string
    textMuted: string
    border: string
    borderLight: string
    primary: string
    success: string
    warning: string
    error: string
  }
  onTaskCreate?: (task: { title: string; status: string; assignee?: string; dueDate?: string }) => void
}

const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
  { id: '3', name: 'Mike Johnson', email: 'mike@example.com' }
]

const statusOptions = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'DONE', label: 'Done' },
  { value: 'BLOCKED', label: 'Blocked' }
]

export default function FabAddTask({ colors, onTaskCreate }: FabAddTaskProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    status: 'TODO',
    assignee: '',
    dueDate: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    onTaskCreate?.({
      title: formData.title,
      status: formData.status,
      assignee: formData.assignee || undefined,
      dueDate: formData.dueDate || undefined
    })

    // Reset form and close
    setFormData({ title: '', status: 'TODO', assignee: '', dueDate: '' })
    setIsOpen(false)
  }

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50"
        style={{ backgroundColor: colors.primary }}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Quick Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md" style={{ backgroundColor: colors.surfaceElevated }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.text }}>Create New Task</DialogTitle>
            <DialogDescription style={{ color: colors.textSecondary }}>
              Quickly add a new task to your project
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium" style={{ color: colors.text }}>
                Task Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter task title..."
                className="mt-1"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium" style={{ color: colors.text }}>
                Status
              </label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="mt-1" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ backgroundColor: colors.surfaceElevated }}>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium" style={{ color: colors.text }}>
                Assignee
              </label>
              <Select value={formData.assignee} onValueChange={(value) => setFormData({ ...formData, assignee: value })}>
                <SelectTrigger className="mt-1" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                  <SelectValue placeholder="Select assignee..." />
                </SelectTrigger>
                <SelectContent style={{ backgroundColor: colors.surfaceElevated }}>
                  <SelectItem value="">Unassigned</SelectItem>
                  {mockUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium" style={{ color: colors.text }}>
                Due Date
              </label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="mt-1"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!formData.title.trim()}
                style={{ backgroundColor: colors.primary }}
              >
                Create Task
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}




