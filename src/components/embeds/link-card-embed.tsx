"use client"

import { EmbedComponentProps } from "@/types/embeds"
import { ExternalLink, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function LinkCardEmbed({ embed, isEditable = false }: EmbedComponentProps) {
  const url = embed.url || ""
  const title = embed.title || "Link"
  const description = embed.description || ""
  const thumbnail = embed.thumbnail

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow">
      <div className="flex">
        {thumbnail && (
          <div className="w-32 h-24 bg-gray-100 flex-shrink-0">
            <img
              src={thumbnail}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide image if it fails to load
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}
        
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
                {title}
              </h3>
              {description && (
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                  {description}
                </p>
              )}
              <p className="text-xs text-gray-500 truncate">
                {new URL(url).hostname}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 ml-2 flex-shrink-0"
              onClick={() => window.open(url, '_blank')}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
