import React from 'react'
import { ExternalLink, FileText, Users, FolderOpen, Activity, BookOpen, User } from 'lucide-react'
import { AISource } from '@/lib/ai/providers'

interface SourceCitationsProps {
  sources: AISource[]
}

const getSourceIcon = (type: AISource['type']) => {
  switch (type) {
    case 'wiki':
      return <FileText className="h-3 w-3" />
    case 'project':
      return <FolderOpen className="h-3 w-3" />
    case 'task':
      return <Activity className="h-3 w-3" />
    case 'org':
      return <Users className="h-3 w-3" />
    case 'onboarding':
      return <User className="h-3 w-3" />
    case 'documentation':
      return <BookOpen className="h-3 w-3" />
    default:
      return <FileText className="h-3 w-3" />
  }
}

const getSourceColor = (type: AISource['type']) => {
  switch (type) {
    case 'wiki':
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'project':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'task':
      return 'text-purple-600 bg-purple-50 border-purple-200'
    case 'org':
      return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'onboarding':
      return 'text-pink-600 bg-pink-50 border-pink-200'
    case 'documentation':
      return 'text-gray-600 bg-gray-50 border-gray-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export function SourceCitations({ sources }: SourceCitationsProps) {
  // Don't render anything if no sources or empty array
  if (!sources || sources.length === 0) {
    return null
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span className="text-xs text-gray-500 font-medium">Sources used:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {sources.slice(0, 3).map((source, index) => (
          <a
            key={`${source.type}-${source.id}-${index}`}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors hover:shadow-sm ${getSourceColor(source.type)}`}
            title={source.excerpt}
          >
            {getSourceIcon(source.type)}
            <span className="truncate max-w-[120px]">{source.title}</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
          </a>
        ))}
        {sources.length > 3 && (
          <span className="text-xs text-gray-400 px-2 py-1">
            +{sources.length - 3} more
          </span>
        )}
      </div>
    </div>
  )
}
