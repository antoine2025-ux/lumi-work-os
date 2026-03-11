"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Lightbulb,
  TrendingDown,
  Users,
  FileText,
  Calendar,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { InsightPriorityV0, InsightCategoryV0 } from "@/lib/loopbrain/contract/proactiveInsight.v0"

// =============================================================================
// Types
// =============================================================================

interface InsightItem {
  id: string
  title: string
  description: string
  priority: InsightPriorityV0
  category: InsightCategoryV0
  confidence: number
  recommendations: Array<{
    action: string
    deepLink?: string
  }>
}

interface InsightsCardProps {
  className?: string
}

// =============================================================================
// Priority/Category Styling
// =============================================================================

const priorityConfig: Record<
  InsightPriorityV0,
  { variant: "destructive" | "default" | "secondary" | "outline"; label: string }
> = {
  CRITICAL: { variant: "destructive", label: "Critical" },
  HIGH: { variant: "destructive", label: "High" },
  MEDIUM: { variant: "default", label: "Medium" },
  LOW: { variant: "secondary", label: "Low" },
  INFO: { variant: "outline", label: "Info" },
}

const categoryIcons: Partial<Record<InsightCategoryV0, typeof AlertTriangle>> = {
  CAPACITY: Users,
  WORKLOAD: TrendingDown,
  PROJECT: AlertTriangle,
  PROCESS: FileText,
  COMMUNICATION: Calendar,
}

// =============================================================================
// Component
// =============================================================================

export function InsightsCard({ className }: InsightsCardProps) {
  const [insights, setInsights] = useState<InsightItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/loopbrain/insights?status=ACTIVE&limit=5")
      if (!res.ok) throw new Error("Failed to load insights")
      const data = await res.json()
      setInsights(
        (data.insights || []).map((i: Record<string, unknown>) => ({
          id: i.id as string,
          title: i.title as string,
          description: i.description as string,
          priority: i.priority as InsightPriorityV0,
          category: i.category as InsightCategoryV0,
          confidence: i.confidence as number,
          recommendations: (i.recommendations as Array<{ action: string; deepLink?: string }>) || [],
        }))
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading insights")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [])

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Insights
          </span>
          <div className="flex items-center gap-2">
            {insights.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {insights.length}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchInsights}
              disabled={isLoading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw
                className={cn("h-3 w-3", isLoading && "animate-spin")}
              />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[340px] overflow-y-auto dashboard-card-scroll">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              onClick={fetchInsights}
              size="sm"
              variant="outline"
              className="mt-3"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-3 text-green-500" />
            <p className="text-sm text-muted-foreground">
              No active insights — things look good!
            </p>
          </div>
        ) : (
          insights.map((insight) => {
            const Icon =
              categoryIcons[insight.category] || Lightbulb
            const config = priorityConfig[insight.priority]
            const topRec = insight.recommendations[0]

            return (
              <div
                key={insight.id}
                className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors space-y-2"
              >
                <div className="flex items-start gap-2">
                  <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {insight.title}
                      </p>
                      <Badge variant={config.variant} className="text-[10px] px-1.5 py-0 flex-shrink-0">
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {insight.description}
                    </p>
                  </div>
                </div>
                {topRec?.deepLink && (
                  <a
                    href={topRec.deepLink}
                    className="flex items-center gap-1 text-xs text-primary hover:underline ml-6"
                  >
                    {topRec.action}
                    <ArrowRight className="h-3 w-3" />
                  </a>
                )}
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
