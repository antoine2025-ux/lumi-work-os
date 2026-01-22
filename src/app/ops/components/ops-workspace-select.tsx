'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2 } from 'lucide-react'

export interface OpsWorkspace {
  id: string
  name: string
  slug: string
}

interface OpsWorkspaceSelectProps {
  workspaces: OpsWorkspace[]
  currentWorkspaceId: string | null
}

/**
 * Truncate workspace ID for display (first 8 chars)
 */
function truncateId(id: string): string {
  if (id.length <= 8) return id
  return `${id.substring(0, 8)}...`
}

export function OpsWorkspaceSelect({ 
  workspaces, 
  currentWorkspaceId 
}: OpsWorkspaceSelectProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleWorkspaceChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (value === 'all') {
      // Remove workspace param for "All Workspaces"
      params.delete('workspace')
    } else {
      params.set('workspace', value)
    }
    
    router.push(`${pathname}?${params.toString()}`)
  }

  // Current selection: the workspaceId or 'all'
  const selectedValue = currentWorkspaceId || 'all'

  return (
    <div className="flex items-center gap-2">
      <label 
        htmlFor="workspace-select" 
        className="text-sm text-muted-foreground whitespace-nowrap"
      >
        Workspace:
      </label>
      <Select value={selectedValue} onValueChange={handleWorkspaceChange}>
        <SelectTrigger id="workspace-select" className="w-[200px]">
          <SelectValue placeholder="Select workspace" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>All Workspaces</span>
            </div>
          </SelectItem>
          
          {workspaces.map((workspace) => (
            <SelectItem key={workspace.id} value={workspace.id}>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="truncate max-w-[120px]">{workspace.name}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  ({truncateId(workspace.id)})
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

