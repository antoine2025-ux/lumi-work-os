"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useUserStatusContext } from "@/providers/user-status-provider"
import { formatDistanceToNow } from "date-fns"
import { FileText, Target, Plus, Loader2, CheckSquare } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoopbrainAssistantLauncher } from "@/components/loopbrain/assistant-launcher"
import { TodaysTodosCard } from "@/components/dashboard/todays-todos-card"
import { InsightsCard } from "@/components/dashboard/insights-card"
import { LoopbrainWelcomeCard } from "@/components/dashboard/loopbrain-welcome-card"
import { SpaceList, useInvalidateSpaces } from "@/components/spaces/space-list"
import { CreateSpaceDialog } from "@/components/spaces/create-space-dialog"
import { CreatePageDialog } from "@/components/spaces/create-page-dialog"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import Link from "next/link"
import type { DashboardBootstrap } from "@/lib/types/dashboard-bootstrap"

export default function SpacesHomePage() {
  const router = useRouter()
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false)
  const [isCreatePageOpen, setIsCreatePageOpen] = useState(false)
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const userStatus = useUserStatusContext()
  const invalidateSpaces = useInvalidateSpaces()

  const { data: bootstrap, isLoading: bootstrapLoading } = useQuery({
    queryKey: ["dashboard-bootstrap", workspaceSlug],
    queryFn: async (): Promise<DashboardBootstrap> => {
      const res = await fetch("/api/dashboard/bootstrap")
      if (!res.ok) throw new Error("Failed to load dashboard")
      return res.json()
    },
  })

  const recentPages = bootstrap?.wikiPages ?? []
  const isLoading = userStatus.isLoading || bootstrapLoading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const userName = userStatus?.user?.name
    ? userStatus.user.name.split(" ")[0]
    : "there"

  const companyType = bootstrap?.workspace?.companyType
  const userId = userStatus?.user?.id as string | undefined

  return (
    <>
      <div className="container mx-auto p-6 max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Spaces</h1>
          <p className="text-muted-foreground">Welcome back, {userName}</p>
        </div>

        {/* Loopbrain first-visit welcome */}
        <LoopbrainWelcomeCard
          companyType={companyType}
          userName={userName}
          userId={userId}
        />

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsCreatePageOpen(true)}
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-2" />
              New Page
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsCreateProjectOpen(true)}
              className="flex-1"
            >
              <Target className="w-4 h-4 mr-2" />
              New Project
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsCreateSpaceOpen(true)}
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Space
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/w/${workspaceSlug}/projects`)}
              className="flex-1"
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              View Tasks
            </Button>
          </div>
        </section>

        {/* Unified Spaces */}
        <section>
          <h2 className="text-lg font-semibold mb-3">All Spaces</h2>
          <SpaceList />
        </section>

        {/* Recent Pages */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent Pages</h2>
            <Link href="/wiki" className="text-sm text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          </div>

          {recentPages.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No recent pages</p>
            </Card>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
              {recentPages.map((page) => (
                <Link key={page.id} href={`/wiki/${page.slug}`}>
                  <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer min-w-[250px] flex-shrink-0">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{page.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {page.category || "General"} ·{" "}
                          {formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Tasks */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Today&apos;s Tasks</h2>
          <TodaysTodosCard />
        </section>

        {/* LoopBrain Insights */}
        <section>
          <h2 className="text-lg font-semibold mb-3">LoopBrain Insights</h2>
          <InsightsCard />
        </section>
      </div>

      {/* Global Loopbrain Assistant */}
      <LoopbrainAssistantLauncher mode="spaces" />

      <CreateSpaceDialog
        open={isCreateSpaceOpen}
        onClose={() => setIsCreateSpaceOpen(false)}
        onCreated={() => invalidateSpaces()}
      />

      <CreatePageDialog
        open={isCreatePageOpen}
        onOpenChange={setIsCreatePageOpen}
        workspaceSlug={workspaceSlug}
      />

      <CreateProjectDialog
        open={isCreateProjectOpen}
        onOpenChange={setIsCreateProjectOpen}
        onProjectCreated={(project) => {
          router.push(`/w/${workspaceSlug}/projects/${project.id}`)
        }}
      />
    </>
  )
}
