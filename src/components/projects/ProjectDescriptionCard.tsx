'use client'

import { useState } from 'react'

const MAX_DESCRIPTION_LENGTH = 350

interface ProjectDescriptionCardProps {
  excerpt?: string | null
  description?: string | null
}

export function ProjectDescriptionCard({ description }: ProjectDescriptionCardProps) {
  const [expanded, setExpanded] = useState(false)

  const hasDescription = description && description.trim().length > 0

  if (!hasDescription) {
    return null
  }

  const displayDescription = description!.trim()
  const isLong = displayDescription.length > MAX_DESCRIPTION_LENGTH
  const displayText = isLong && !expanded
    ? displayDescription.substring(0, MAX_DESCRIPTION_LENGTH) + '...'
    : displayDescription

  return (
    <div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {displayText}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-medium text-primary hover:underline mt-1 block"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
