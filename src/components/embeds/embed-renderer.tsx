"use client"

import { EmbedComponentProps } from "@/types/embeds"
import { FigmaEmbed } from "./figma-embed"
import { GitHubEmbed } from "./github-embed"
import { LinkCardEmbed } from "./link-card-embed"

export function EmbedRenderer({ embed, ...props }: EmbedComponentProps) {
  switch (embed.provider) {
    case 'figma':
      return <FigmaEmbed embed={embed} {...props} />
    case 'github':
      return <GitHubEmbed embed={embed} {...props} />
    case 'airtable':
      return <AirtableEmbed embed={embed} {...props} />
    case 'asana':
      return <AsanaEmbed embed={embed} {...props} />
    case 'miro':
      return <MiroEmbed embed={embed} {...props} />
    case 'drawio':
      return <DrawIOEmbed embed={embed} {...props} />
    case 'generic':
    case 'link-card':
      return <LinkCardEmbed embed={embed} {...props} />
    default:
      return <GenericEmbed embed={embed} {...props} />
  }
}

// Placeholder components for providers not yet implemented
function AirtableEmbed({ embed, ...props }: EmbedComponentProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📊</span>
        <span className="font-medium text-sm">Airtable</span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{embed.title || 'Airtable Base'}</p>
      <a 
        href={embed.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:underline"
      >
        Open in Airtable →
      </a>
    </div>
  )
}

function AsanaEmbed({ embed, ...props }: EmbedComponentProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">✅</span>
        <span className="font-medium text-sm">Asana</span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{embed.title || 'Asana Project'}</p>
      <a 
        href={embed.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:underline"
      >
        Open in Asana →
      </a>
    </div>
  )
}

function MiroEmbed({ embed, ...props }: EmbedComponentProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🎯</span>
        <span className="font-medium text-sm">Miro</span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{embed.title || 'Miro Board'}</p>
      <a 
        href={embed.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:underline"
      >
        Open in Miro →
      </a>
    </div>
  )
}

function DrawIOEmbed({ embed, ...props }: EmbedComponentProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📐</span>
        <span className="font-medium text-sm">Draw.io</span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{embed.title || 'Draw.io Diagram'}</p>
      <a 
        href={embed.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:underline"
      >
        Open in Draw.io →
      </a>
    </div>
  )
}

function GenericEmbed({ embed, ...props }: EmbedComponentProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🔗</span>
        <span className="font-medium text-sm">External Link</span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{embed.title || 'External Content'}</p>
      <a 
        href={embed.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:underline"
      >
        Open Link →
      </a>
    </div>
  )
}
