"use client"

import { Badge } from "@/components/ui/badge"
import { ProjectSpaceVisibility } from "@prisma/client"

interface ProjectSpaceBadgeProps {
  visibility: ProjectSpaceVisibility
  className?: string
}

export function ProjectSpaceBadge({ visibility, className }: ProjectSpaceBadgeProps) {
  const isPublic = visibility === 'PUBLIC'
  
  return (
    <Badge 
      variant={isPublic ? "default" : "secondary"}
      className={className}
      style={{
        backgroundColor: isPublic ? '#dcfce7' : '#fef3c7',
        color: isPublic ? '#166534' : '#92400e',
        borderColor: isPublic ? '#86efac' : '#fde68a'
      }}
    >
      {visibility}
    </Badge>
  )
}
