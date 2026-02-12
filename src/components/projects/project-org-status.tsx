'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { CheckCircle, AlertCircle, Users, TrendingUp } from 'lucide-react'

interface Member {
  user: { name: string | null }
  orgPosition?: {
    title: string | null
    department: string | null
    workAllocations: Array<{ hoursAllocated: number | null }>
  } | null
}

interface ProjectOrgStatusProps {
  members: Member[]
}

export function ProjectOrgStatus({ members }: ProjectOrgStatusProps) {
  const membersWithOrg = members.filter((m) => m.orgPosition)
  const orgCoverage =
    members.length > 0
      ? Math.round((membersWithOrg.length / members.length) * 100)
      : 0

  const totalCapacity = membersWithOrg.reduce((sum, m) => {
    const hours =
      m.orgPosition?.workAllocations.reduce(
        (h, a) => h + (a.hoursAllocated ?? 0),
        0
      ) ?? 0
    return sum + hours
  }, 0)

  const avgUtilization =
    membersWithOrg.length > 0
      ? Math.round((totalCapacity / (membersWithOrg.length * 40)) * 100)
      : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          Project-Org Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>Org Coverage</span>
          </div>
          <div className="flex items-center gap-2">
            {orgCoverage === 100 ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            )}
            <span className="font-medium">{orgCoverage}%</span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {membersWithOrg.length} of {members.length} members linked to org
        </div>

        {membersWithOrg.length > 0 && (
          <>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm">Avg Utilization</span>
              <span
                className={`font-medium ${
                  avgUtilization > 100
                    ? 'text-red-600'
                    : avgUtilization > 80
                      ? 'text-yellow-600'
                      : 'text-green-600'
                }`}
              >
                {avgUtilization}%
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {totalCapacity}h allocated across team
            </div>
          </>
        )}

        {members.length - membersWithOrg.length > 0 && (
          <div className="pt-2 text-xs text-yellow-600">
            {members.length - membersWithOrg.length} member(s) not in org
            structure
          </div>
        )}
      </CardContent>
    </Card>
  )
}
