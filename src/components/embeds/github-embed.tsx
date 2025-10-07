"use client"

import { EmbedComponentProps } from "@/types/embeds"
import { ExternalLink, Star, GitFork, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

export function GitHubEmbed({ embed, isEditable = false }: EmbedComponentProps) {
  const githubUrl = embed.url || ""
  const urlParts = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
  const owner = urlParts?.[1]
  const repo = urlParts?.[2]

  if (!owner || !repo) {
    return (
      <div className="border border-red-200 bg-red-50 p-4 rounded-lg">
        <p className="text-red-600">Invalid GitHub URL</p>
      </div>
    )
  }

  const isIssue = githubUrl.includes('/issues/')
  const isPullRequest = githubUrl.includes('/pull/')
  const isFile = githubUrl.includes('/blob/')

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🐙</span>
            <div>
              <h3 className="font-semibold text-sm text-gray-900">
                {owner}/{repo}
              </h3>
              <p className="text-xs text-gray-500">
                {isIssue ? 'Issue' : isPullRequest ? 'Pull Request' : isFile ? 'File' : 'Repository'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => window.open(githubUrl, '_blank')}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>

        {embed.title && (
          <div className="mb-3">
            <h4 className="font-medium text-sm text-gray-900 mb-1">
              {embed.title}
            </h4>
            {embed.description && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {embed.description}
              </p>
            )}
          </div>
        )}

        {/* Repository stats */}
        {!isIssue && !isPullRequest && !isFile && embed.metadata && (
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {embed.metadata.stargazers_count && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                <span>{embed.metadata.stargazers_count}</span>
              </div>
            )}
            {embed.metadata.forks_count && (
              <div className="flex items-center gap-1">
                <GitFork className="h-3 w-3" />
                <span>{embed.metadata.forks_count}</span>
              </div>
            )}
            {embed.metadata.watchers_count && (
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{embed.metadata.watchers_count}</span>
              </div>
            )}
            {embed.metadata.language && (
              <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                {embed.metadata.language}
              </span>
            )}
          </div>
        )}

        {/* Issue/PR specific info */}
        {(isIssue || isPullRequest) && embed.metadata && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">
                #{embed.metadata.number}
              </span>
              <span className={`px-2 py-1 rounded text-xs ${
                embed.metadata.state === 'open' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {embed.metadata.state}
              </span>
            </div>
            {embed.metadata.created_at && (
              <div className="text-gray-500 mt-1">
                Created {new Date(embed.metadata.created_at).toLocaleDateString()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
