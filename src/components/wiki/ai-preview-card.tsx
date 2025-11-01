"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Check, 
  X, 
  FileText, 
  Plus, 
  Edit, 
  ListTodo, 
  Tag, 
  Search,
  MessageSquare,
  TrendingUp
} from "lucide-react"
import ReactMarkdown from "react-markdown"

interface LoopwellAIResponse {
  intent: 'answer' | 'summarize' | 'improve_existing_page' | 'append_to_page' | 'create_new_page' | 'extract_tasks' | 'find_things' | 'tag_pages' | 'do_nothing'
  confidence: number
  rationale: string
  citations: Array<{ title: string; id: string }>
  preview: {
    title?: string
    markdown?: string
    diff?: string
    tasks?: Array<{
      title: string
      description: string
      assignee_suggestion?: string
      due_suggestion?: string
      labels: string[]
    }>
    tags?: string[]
  }
  next_steps: Array<'ask_clarifying_question' | 'insert' | 'replace_section' | 'create_page' | 'create_tasks'>
}

interface AIPreviewCardProps {
  response: LoopwellAIResponse
  onConfirm?: () => void
  onReject?: () => void
  onContentUpdate?: (content: string) => void
  onTitleUpdate?: (title: string) => void
}

const intentIcons = {
  answer: MessageSquare,
  summarize: TrendingUp,
  improve_existing_page: Edit,
  append_to_page: Plus,
  create_new_page: FileText,
  extract_tasks: ListTodo,
  find_things: Search,
  tag_pages: Tag,
  do_nothing: MessageSquare
}

const intentLabels = {
  answer: 'Answer',
  summarize: 'Summary',
  improve_existing_page: 'Improve Page',
  append_to_page: 'Append to Page',
  create_new_page: 'Create Page',
  extract_tasks: 'Extract Tasks',
  find_things: 'Find Documents',
  tag_pages: 'Suggest Tags',
  do_nothing: 'Clarification Needed'
}

export function AIPreviewCard({ 
  response, 
  onConfirm, 
  onReject,
  onContentUpdate,
  onTitleUpdate
}: AIPreviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const IntentIcon = intentIcons[response.intent]

  const handleConfirm = () => {
    if (response.intent === 'create_new_page' || response.intent === 'append_to_page') {
      // Update content if provided
      if (response.preview?.markdown && onContentUpdate) {
        onContentUpdate(response.preview.markdown)
      }
      // Update title if provided
      if (response.preview?.title && onTitleUpdate) {
        onTitleUpdate(response.preview.title)
      }
    }
    onConfirm?.()
  }

  // Don't show preview for answer or find_things intents (no write action)
  const showPreview = !['answer', 'find_things', 'do_nothing'].includes(response.intent)

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IntentIcon className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-base">{intentLabels[response.intent]}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {Math.round(response.confidence * 100)}% confident
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
        <CardDescription className="text-sm mt-1">
          {response.rationale}
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Citations */}
          {response.citations.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Sources:</p>
              <div className="flex flex-wrap gap-2">
                {response.citations.map((citation, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {citation.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Preview Content */}
          {showPreview && response.preview && (
            <div className="space-y-4">
              {/* Title Preview */}
              {response.preview.title && (
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Suggested Title:</p>
                  <p className="text-sm font-semibold">{response.preview.title}</p>
                </div>
              )}

              {/* Markdown Preview */}
              {response.preview.markdown && (
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
                  <div className="prose prose-sm dark:prose-invert max-w-none border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 max-h-96 overflow-y-auto">
                    <ReactMarkdown>{response.preview.markdown}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Diff Preview (for improvements) */}
              {response.intent === 'improve_existing_page' && response.preview.diff && (
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Changes:</p>
                  <div className="text-sm text-gray-700 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900/20 border rounded-lg p-3">
                    {(() => {
                      // Handle diff - could be comma-separated string or markdown
                      const diffText = response.preview.diff
                      // If it's a comma-separated list, convert to bullet points
                      if (diffText.includes(',') && !diffText.includes('\n')) {
                        const items = diffText.split(',').map(item => item.trim()).filter(Boolean)
                        return (
                          <ul className="list-disc list-inside space-y-1">
                            {items.map((item, idx) => (
                              <li key={idx} className="text-sm">{item}</li>
                            ))}
                          </ul>
                        )
                      }
                      // Otherwise render as markdown
                      return <ReactMarkdown>{diffText}</ReactMarkdown>
                    })()}
                  </div>
                </div>
              )}

              {/* Tasks Preview */}
              {response.intent === 'extract_tasks' && response.preview.tasks && (
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Extracted Tasks ({response.preview.tasks.length}):
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {response.preview.tasks.map((task, idx) => (
                      <div key={idx} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {task.assignee_suggestion && (
                            <Badge variant="outline" className="text-xs">
                              Assignee: {task.assignee_suggestion}
                            </Badge>
                          )}
                          {task.due_suggestion && (
                            <Badge variant="outline" className="text-xs">
                              Due: {task.due_suggestion}
                            </Badge>
                          )}
                          {task.labels.length > 0 && (
                            <div className="flex gap-1">
                              {task.labels.map((label, lidx) => (
                                <Badge key={lidx} variant="secondary" className="text-xs">
                                  {label}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags Preview */}
              {response.intent === 'tag_pages' && response.preview.tags && (
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Suggested Tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {response.preview.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Regular Answer/Find Things (no preview needed) */}
          {!showPreview && response.preview?.markdown && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{response.preview.markdown}</ReactMarkdown>
            </div>
          )}

          {/* Action Buttons */}
          {showPreview && (
            <div className="flex items-center justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={onReject}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Check className="h-4 w-4 mr-2" />
                {response.intent === 'create_new_page' ? 'Create Page' : 
                 response.intent === 'append_to_page' ? 'Append to Page' :
                 response.intent === 'improve_existing_page' ? 'Apply Changes' :
                 response.intent === 'extract_tasks' ? 'Create Tasks' :
                 response.intent === 'tag_pages' ? 'Apply Tags' :
                 'Confirm'}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
