"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Edit3,
  MoreHorizontal,
  Clock,
  User,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Star,
  Tag,
  CheckCircle,
  Upload,
  Users,
  Bell,
  Archive,
  Grid3X3
} from "lucide-react"
import Link from "next/link"
import { WikiLayout } from "@/components/wiki/wiki-layout"
import { EnhancedRichTextEditor } from "@/components/wiki/enhanced-rich-text-editor"

export default function EnhancedWikiPage() {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(`
    <h2>Introduction</h2>
    <p>Effective project management is crucial for delivering successful outcomes in today's fast-paced business environment. This guide outlines proven strategies and best practices that can help teams achieve their goals efficiently and effectively.</p>
    
    <h2>Key Principles</h2>
    <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
      <div style="width: 24px; height: 24px; background-color: #e0e7ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-top: 4px;">
        <span style="color: #6366f1; font-size: 12px; font-weight: 600;">1</span>
      </div>
      <div>
        <h3 style="font-weight: 600; color: #111827; margin-bottom: 4px;">Clear Communication</h3>
        <p style="color: #374151;">Establish transparent communication channels and regular check-ins to ensure everyone stays aligned.</p>
      </div>
    </div>
    
    <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
      <div style="width: 24px; height: 24px; background-color: #e0e7ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-top: 4px;">
        <span style="color: #6366f1; font-size: 12px; font-weight: 600;">2</span>
      </div>
      <div>
        <h3 style="font-weight: 600; color: #111827; margin-bottom: 4px;">Define Clear Objectives</h3>
        <p style="color: #374151;">Set specific, measurable, achievable, relevant, and time-bound (SMART) goals for your projects.</p>
      </div>
    </div>
    
    <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
      <div style="width: 24px; height: 24px; background-color: #e0e7ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-top: 4px;">
        <span style="color: #6366f1; font-size: 12px; font-weight: 600;">3</span>
      </div>
      <div>
        <h3 style="font-weight: 600; color: #111827; margin-bottom: 4px;">Risk Management</h3>
        <p style="color: #374151;">Identify potential risks early and develop contingency plans to mitigate their impact.</p>
      </div>
    </div>

    <h2>Tools and Technologies</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px;">
      <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px;">
        <h3 style="font-weight: 600; color: #111827; margin-bottom: 8px;">Project Tracking</h3>
        <p style="color: #374151; font-size: 14px;">Use tools like Loopwell's project management features to track progress and manage tasks effectively.</p>
      </div>
      <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px;">
        <h3 style="font-weight: 600; color: #111827; margin-bottom: 8px;">Collaboration</h3>
        <p style="color: #374151; font-size: 14px;">Leverage integrated communication tools to keep team members connected and informed.</p>
      </div>
    </div>

    <h2>Conclusion</h2>
    <p>By implementing these best practices and leveraging the right tools, teams can significantly improve their project management capabilities and deliver better results. Remember that successful project management is an ongoing process that requires continuous improvement and adaptation.</p>
  `)

  const [comments, setComments] = useState([
    {
      id: '1',
      author: 'Mike Johnson',
      avatar: 'MJ',
      content: 'Great overview! The communication section really resonates with our current challenges.',
      timestamp: '2 hours ago',
      avatarColor: 'from-blue-500 to-purple-600'
    },
    {
      id: '2',
      author: 'Alex Lee',
      avatar: 'AL',
      content: 'Would love to see more details about risk management strategies. Any specific frameworks you recommend?',
      timestamp: '1 day ago',
      avatarColor: 'from-emerald-500 to-teal-600'
    }
  ])

  const [newComment, setNewComment] = useState('')

  const handleSave = () => {
    // Here you would save the content to the database
    console.log('Saving content:', content)
    setIsEditing(false)
  }

  const handleAddComment = () => {
    if (!newComment.trim()) return
    
    const comment = {
      id: Date.now().toString(),
      author: 'Current User',
      avatar: 'CU',
      content: newComment,
      timestamp: 'Just now',
      avatarColor: 'from-indigo-500 to-purple-600'
    }
    
    setComments([comment, ...comments])
    setNewComment('')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const currentPage = {
    id: 'project-management-guide',
    title: 'Project Management Best Practices',
    slug: 'project-management-best-practices',
    author: 'Sarah Johnson',
    updatedAt: '2024-01-15T10:30:00Z',
    viewCount: 24,
    tags: ['Project Management', 'Best Practices', 'Team Collaboration']
  }

  return (
    <WikiLayout currentPage={currentPage}>
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Project Management Best Practices</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Sarah Johnson</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Updated 2 days ago</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>24 views</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                <Heart className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tags */}
          <div className="flex gap-2 mb-6">
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">Project Management</span>
            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">Best Practices</span>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Team Collaboration</span>
          </div>
        </div>

        {/* Page Content */}
        <div className="max-w-4xl">
          {isEditing ? (
            <div className="space-y-4">
              <EnhancedRichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Start writing your content..."
                editable={true}
                showToolbar={true}
                className="min-h-[400px]"
              />
              <div className="flex gap-3">
                <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
              />
              <div className="mt-8 pt-6 border-t border-gray-200">
                <Button 
                  onClick={() => setIsEditing(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Page
                </Button>
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Comments</h3>
              <span className="text-sm text-gray-500">({comments.length})</span>
            </div>
            
            <div className="space-y-4 mb-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className={`w-8 h-8 bg-gradient-to-br ${comment.avatarColor} rounded-full flex items-center justify-center`}>
                    <span className="text-white text-sm font-semibold">{comment.avatar}</span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">{comment.author}</span>
                        <span className="text-xs text-gray-500">{comment.timestamp}</span>
                      </div>
                      <p className="text-gray-700 text-sm">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">CU</span>
              </div>
              <div className="flex-1">
                <Input 
                  placeholder="Add a comment..." 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="bg-gray-50 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAddComment()
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </WikiLayout>
  )
}
