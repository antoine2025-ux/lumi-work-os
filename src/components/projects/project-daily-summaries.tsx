"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Calendar, 
  Bot, 
  Loader2, 
  RefreshCw, 
  Settings,
  Clock,
  FileText
} from 'lucide-react'
import { format } from 'date-fns'

interface DailySummary {
  id: string
  date: string
  text: string
  createdAt: string
}

interface ProjectDailySummariesProps {
  projectId: string
  projectName: string
  dailySummaryEnabled: boolean
  onToggleDailySummary: (enabled: boolean) => void
}

export function ProjectDailySummaries({ 
  projectId, 
  projectName, 
  dailySummaryEnabled, 
  onToggleDailySummary 
}: ProjectDailySummariesProps) {
  const [summaries, setSummaries] = useState<DailySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUpdatingSetting, setIsUpdatingSetting] = useState(false)

  useEffect(() => {
    loadSummaries()
  }, [projectId])

  const loadSummaries = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/projects/${projectId}/daily-summaries?limit=30`)
      if (response.ok) {
        const data = await response.json()
        setSummaries(data)
      } else {
        console.error('Failed to load daily summaries:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading daily summaries:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateSummaryNow = async () => {
    try {
      setIsGenerating(true)
      const response = await fetch(`/api/projects/${projectId}/daily-summaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })

      if (response.ok) {
        const data = await response.json()
        // Reload summaries to show the new one
        await loadSummaries()
      } else {
        const errorData = await response.json()
        console.error('Failed to generate summary:', errorData)
        alert(`Failed to generate summary: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error generating summary:', error)
      alert('Failed to generate summary. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleToggleDailySummary = async (enabled: boolean) => {
    try {
      setIsUpdatingSetting(true)
      const response = await fetch(`/api/projects/${projectId}/daily-summary-settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dailySummaryEnabled: enabled })
      })

      if (response.ok) {
        onToggleDailySummary(enabled)
      } else {
        const errorData = await response.json()
        console.error('Failed to update setting:', errorData)
        alert(`Failed to update setting: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error updating setting:', error)
      alert('Failed to update setting. Please try again.')
    } finally {
      setIsUpdatingSetting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'MMM dd, yyyy')
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'h:mm a')
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Daily AI Summary Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="daily-summary-toggle" className="text-sm font-medium">
                Daily AI Summary
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically generate AI-powered daily summaries at 8:00 AM
              </p>
            </div>
            <Switch
              id="daily-summary-toggle"
              checked={dailySummaryEnabled}
              onCheckedChange={handleToggleDailySummary}
              disabled={isUpdatingSetting}
            />
          </div>
          
          {dailySummaryEnabled && (
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generateSummaryNow}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Generate Summary Now
              </Button>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Next: 8:00 AM daily</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summaries List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Daily Summaries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summaries.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No summaries yet</h3>
              <p className="text-muted-foreground mb-4">
                {dailySummaryEnabled 
                  ? 'Daily summaries will appear here once generated.'
                  : 'Enable daily summaries to start generating AI-powered project summaries.'
                }
              </p>
              {!dailySummaryEnabled && (
                <Button onClick={() => handleToggleDailySummary(true)}>
                  Enable Daily Summaries
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {summaries.map((summary) => (
                <Card key={summary.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatDate(summary.date)}</span>
                        <Badge variant="outline" className="text-xs">
                          {formatTime(summary.createdAt)}
                        </Badge>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        AI Generated
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {summary.text}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
