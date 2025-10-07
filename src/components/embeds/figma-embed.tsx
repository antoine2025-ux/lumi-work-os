"use client"

import { EmbedComponentProps } from "@/types/embeds"
import { ExternalLink, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FigmaEmbed({ embed, isEditable = false }: EmbedComponentProps) {
  const figmaUrl = embed.url || ""
  const fileId = figmaUrl.match(/figma\.com\/file\/([a-zA-Z0-9]+)/)?.[1]
  
  if (!fileId) {
    return (
      <div className="border border-red-200 bg-red-50 p-4 rounded-lg">
        <p className="text-red-600">Invalid Figma URL</p>
      </div>
    )
  }

  const embedUrl = `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(figmaUrl)}`

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎨</span>
          <span className="font-medium text-sm">Figma Design</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => window.open(figmaUrl, '_blank')}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
          {isEditable && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                // TODO: Implement fullscreen mode
              }}
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="aspect-video">
        <iframe
          src={embedUrl}
          allowFullScreen
          className="w-full h-full border-0"
          title={embed.title || "Figma Design"}
        />
      </div>
      
      {embed.title && (
        <div className="p-3 bg-gray-50">
          <p className="text-sm font-medium text-gray-900">{embed.title}</p>
          {embed.description && (
            <p className="text-xs text-gray-600 mt-1">{embed.description}</p>
          )}
        </div>
      )}
    </div>
  )
}
