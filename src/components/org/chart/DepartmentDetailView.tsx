"use client"

import React from "react"
import Link from "next/link"
import { OrgCard } from "@/components/org/ui/OrgCard"
import type { StructureTeam } from "@/types/org"

type DepartmentDetailViewProps = {
  department: {
    id: string
    name: string
    teamCount: number
  }
  teams: StructureTeam[]
  canManageStructure?: boolean
}

export function DepartmentDetailView({
  department,
  teams,
  canManageStructure: _canManageStructure = false,
}: DepartmentDetailViewProps) {
  return (
    <OrgCard 
      title={department.name}
      subtitle={`${department.teamCount} ${department.teamCount === 1 ? "team" : "teams"} · Teams and people in this department.`}
    >
      {teams.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No teams in this department yet.
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => (
            <div 
              key={team.id} 
              className="rounded-xl border bg-background p-4 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{team.name}</div>
                  {team.leadName && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Lead: {team.leadName}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
                  </div>
                </div>
                <Link
                  href={`/org/people?teamId=${team.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  View people →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </OrgCard>
  )
}

