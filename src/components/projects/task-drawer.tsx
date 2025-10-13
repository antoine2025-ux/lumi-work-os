"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  X, 
  Calendar, 
  User, 
  Tag, 
  MessageSquare, 
  Paperclip, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Plus,
  Send,
  Upload
} from "lucide-react"

interface TaskDrawerProps {
  isOpen: boolean
  onClose: () => void
  task: {
    id: string
    title: string
    description?: string
    status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    assignee?: {
      id: string
      name: string
      email: string
    }
    dueDate?: string
    tags: string[]
    createdAt: string
    updatedAt: string
  } | null
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
  onTaskUpdate?: (taskId: string, updates: any) => void
}

interface Comment {
  id: string
  content: string
  author: {
    id: string
    name: string
    email: string
  }
  mentions: string[]
  createdAt: string
}

interface Attachment {
  id: string
  filename: string
  mimeType: string
  size: number
  url: string
  uploadedBy: {
    id: string
    name: string
  }
  createdAt: string
}

// Mock data
const mockComments: Comment[] = [
  {
    id: '1',
    content: 'This looks great! @jane can you review the design?',
    author: { id: '1', name: 'John Doe', email: 'john@example.com' },
    mentions: ['2'],
    createdAt: '2024-01-20T10:30:00Z'
  },
  {
    id: '2',
    content: 'Sure! I\'ll take a look and provide feedback by tomorrow.',
    author: { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    mentions: [],
    createdAt: '2024-01-20T11:15:00Z'
  }
]

const mockAttachments: Attachment[] = [
  {
    id: '1',
    filename: 'design-mockup-v2.png',
    mimeType: 'image/png',
    size: 2048576,
    url: '#',
    uploadedBy: { id: '1', name: 'John Doe' },
    createdAt: '2024-01-20T09:00:00Z'
  },
  {
    id: '2',
    filename: 'requirements.pdf',
    mimeType: 'application/pdf',
    size: 1024000,
    url: '#',
    uploadedBy: { id: '2', name: 'Jane Smith' },
    createdAt: '2024-01-19T14:30:00Z'
  }
]

const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
  { id: '3', name: 'Mike Johnson', email: 'mike@example.com' }
]

export default function TaskDrawer({ isOpen, onClose, task, colors, onTaskUpdate }: TaskDrawerProps) {
  const [newComment, setNewComment] = useState('')
  const [comments] = useState<Comment[]>(mockComments)
  const [attachments] = useState<Attachment[]>(mockAttachments)

  if (!task) return null

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DONE': return <CheckCircle className="h-4 w-4" style={{ color: colors.success }} />
      case 'IN_PROGRESS': return <Clock className="h-4 w-4" style={{ color: colors.primary }} />
      case 'BLOCKED': return <AlertCircle className="h-4 w-4" style={{ color: colors.error }} />
      default: return <Clock className="h-4 w-4" style={{ color: colors.textSecondary }} />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return colors.error
      case 'HIGH': return colors.warning
      case 'MEDIUM': return colors.primary
      case 'LOW': return colors.textSecondary
      default: return colors.textSecondary
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    
    // In a real app, this would create a comment
    console.log('New comment:', newComment)
    setNewComment('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" 
        style={{ backgroundColor: colors.surfaceElevated }}
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl" style={{ color: colors.text }}>
                {task.title}
              </DialogTitle>
              <DialogDescription style={{ color: colors.textSecondary }}>
                Created {new Date(task.createdAt).toLocaleDateString()}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Essentials Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon(task.status)}
                <span className="text-sm font-medium" style={{ color: colors.text }}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getPriorityColor(task.priority) }}
                />
                <span className="text-sm" style={{ color: colors.textSecondary }}>
                  {task.priority} Priority
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {task.assignee && (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" style={{ color: colors.textSecondary }} />
                  <span className="text-sm" style={{ color: colors.text }}>
                    {task.assignee.name}
                  </span>
                </div>
              )}
              
              {task.dueDate && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" style={{ color: colors.textSecondary }} />
                  <span className="text-sm" style={{ color: colors.text }}>
                    Due {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Tag className="h-4 w-4" style={{ color: colors.textSecondary }} />
                <span className="text-sm font-medium" style={{ color: colors.text }}>Tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {task.tags.map(tag => (
                  <Badge 
                    key={tag} 
                    variant="secondary"
                    style={{ backgroundColor: colors.surface, color: colors.text }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium mb-2" style={{ color: colors.text }}>Description</h3>
            <div 
              className="p-3 rounded border"
              style={{ 
                backgroundColor: colors.surface, 
                borderColor: colors.border,
                color: colors.text 
              }}
            >
              {task.description || 'No description provided'}
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium" style={{ color: colors.text }}>Subtasks</h3>
              <Button variant="ghost" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add subtask
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 p-2 rounded" style={{ backgroundColor: colors.surface }}>
                <CheckCircle className="h-4 w-4" style={{ color: colors.success }} />
                <span className="text-sm" style={{ color: colors.text }}>Research competitors</span>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded" style={{ backgroundColor: colors.surface }}>
                <Clock className="h-4 w-4" style={{ color: colors.textSecondary }} />
                <span className="text-sm" style={{ color: colors.text }}>Create user personas</span>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium" style={{ color: colors.text }}>Attachments</h3>
              <Button variant="ghost" size="sm">
                <Upload className="h-4 w-4 mr-1" />
                Upload
              </Button>
            </div>
            <div className="space-y-2">
              {attachments.map(attachment => (
                <div 
                  key={attachment.id}
                  className="flex items-center justify-between p-3 rounded border"
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                >
                  <div className="flex items-center space-x-3">
                    <Paperclip className="h-4 w-4" style={{ color: colors.textSecondary }} />
                    <div>
                      <div className="text-sm font-medium" style={{ color: colors.text }}>
                        {attachment.filename}
                      </div>
                      <div className="text-xs" style={{ color: colors.textSecondary }}>
                        {formatFileSize(attachment.size)} • {attachment.uploadedBy.name}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div>
            <h3 className="text-sm font-medium mb-3" style={{ color: colors.text }}>Comments</h3>
            
            {/* Comments List */}
            <div className="space-y-4 mb-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback style={{ backgroundColor: colors.primary, color: 'white' }}>
                      {comment.author.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium" style={{ color: colors.text }}>
                        {comment.author.name}
                      </span>
                      <span className="text-xs" style={{ color: colors.textMuted }}>
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div 
                      className="text-sm p-3 rounded"
                      style={{ backgroundColor: colors.surface, color: colors.text }}
                    >
                      {comment.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleCommentSubmit} className="space-y-3">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment... Use @ to mention someone"
                className="min-h-[80px]"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              />
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={!newComment.trim()}
                  style={{ backgroundColor: colors.primary }}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Comment
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
