"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Send, AtSign } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
}

interface Comment {
  id: string
  content: string
  mentions?: string[]
  createdAt: string
  user: User
}

interface TaskCommentsProps {
  taskId: string
  projectId: string
}

export function TaskComments({ taskId, projectId }: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [projectMembers, setProjectMembers] = useState<User[]>([])
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([])
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadComments()
    loadProjectMembers()
  }, [taskId])

  const loadComments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/tasks/${taskId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data)
      } else {
        console.error('Failed to load comments:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadProjectMembers = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members`)
      if (response.ok) {
        const data = await response.json()
        setProjectMembers(data.map((member: { user: User }) => member.user))
      }
    } catch (error) {
      console.error('Error loading project members:', error)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart
    setNewComment(value)
    setCursorPosition(cursorPos)

    // Check for @ mentions
    const textBeforeCursor = value.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const query = textBeforeCursor.substring(lastAtIndex + 1)
      if (!query.includes(' ') && !query.includes('\n')) {
        setMentionQuery(query)
        setShowMentions(true)
        return
      }
    }
    
    setShowMentions(false)
  }

  useEffect(() => {
    if (showMentions) {
      setMentionSelectedIndex(0)
    }
  }, [showMentions, mentionQuery])

  const handleMentionSelect = (user: User) => {
    const textBeforeCursor = newComment.substring(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    const textAfterCursor = newComment.substring(cursorPosition)
    
    const newText = 
      newComment.substring(0, lastAtIndex) + 
      `@${user.name} ` + 
      textAfterCursor
    
    setNewComment(newText)
    setSelectedMentionIds((prev) =>
      prev.includes(user.id) ? prev : [...prev, user.id]
    )
    setShowMentions(false)
    setMentionQuery('')
    
    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = lastAtIndex + `@${user.name} `.length
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return

    try {
      setIsSubmitting(true)
      
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim(),
          mentions: selectedMentionIds,
        }),
      })

      if (response.ok) {
        const newCommentData = await response.json()
        setComments(prev => [...prev, newCommentData])
        setNewComment('')
        setSelectedMentionIds([])
        setShowMentions(false)
      } else {
        console.error('Failed to create comment:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error creating comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionSelectedIndex((i) =>
          i < filteredMembers.length - 1 ? i + 1 : 0
        )
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionSelectedIndex((i) =>
          i > 0 ? i - 1 : filteredMembers.length - 1
        )
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const member = filteredMembers[mentionSelectedIndex]
        if (member) {
          handleMentionSelect(member)
        }
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowMentions(false)
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitComment()
    }
  }

  const formatCommentContent = (content: string) => {
    // Replace @mentions with styled spans
    return content.replace(/@(\w+)/g, (match, name) => {
      const user = projectMembers.find(member => 
        member.name.toLowerCase().replace(/\s+/g, '') === name.toLowerCase()
      )
      return user ? `<span class="mention">${match}</span>` : match
    })
  }

  const filteredMembers = projectMembers
    .filter((member) =>
      member.name.toLowerCase().includes(mentionQuery.toLowerCase())
    )
    .slice(0, 8)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Comments List */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <AtSign className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="p-4">
              <CardContent className="p-0">
                <div className="flex items-start space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {comment.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm">{comment.user.name}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    
                    <div 
                      className="text-sm text-gray-700 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ 
                        __html: formatCommentContent(comment.content) 
                      }}
                    />
                    
                    {comment.mentions && comment.mentions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {comment.mentions.map((mentionId: string) => {
                          const user = projectMembers.find(m => m.id === mentionId)
                          return user ? (
                            <Badge key={mentionId} variant="outline" className="text-xs">
                              @{user.name}
                            </Badge>
                          ) : null
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Comment Input */}
      <div className="space-y-2">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={newComment}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment... Use @ to mention someone"
            className="min-h-[80px] resize-none"
          />
          
          {/* Mentions Dropdown */}
          {showMentions && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member, index) => (
                  <button
                    key={member.id}
                    onClick={() => handleMentionSelect(member)}
                    className={`w-full px-3 py-2 text-left hover:bg-muted flex items-center space-x-2 ${
                      index === mentionSelectedIndex ? 'bg-muted' : ''
                    }`}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{member.name}</span>
                    <span className="text-xs text-gray-500">({member.email})</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No members found
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || isSubmitting}
            size="sm"
            className="flex items-center space-x-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>Comment</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
