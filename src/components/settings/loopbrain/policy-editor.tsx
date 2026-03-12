"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Zap,
  Play,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import { useToast } from "@/components/ui/use-toast"
import { SuggestionCard } from "./SuggestionCard"
import type { PolicySuggestion } from "@/lib/loopbrain/policies/types"

interface PolicyEditorProps {
  policyId: string | null
  onBack: () => void
  onSaved: () => void
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function PolicyEditor({ policyId, onBack, onSaved }: PolicyEditorProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [content, setContent] = useState("")
  const [triggerType, setTriggerType] = useState<string>("SCHEDULE")
  const [scheduleType, setScheduleType] = useState<string>("WEEKLY")
  const [scheduleTime, setScheduleTime] = useState("08:00")
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(1)
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState(1)
  const [emailKeywords, setEmailKeywords] = useState("")
  const [emailFromFilter, setEmailFromFilter] = useState("")
  const [maxActions, setMaxActions] = useState(50)
  const [showPreview, setShowPreview] = useState(false)

  const [editorRefreshKey, setEditorRefreshKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [compiling, setCompiling] = useState(false)
  const [testing, setTesting] = useState(false)
  const [compileResult, setCompileResult] = useState<{
    success: boolean
    error?: string
    warnings?: string[]
    stepCount?: number
    suggestions?: PolicySuggestion[]
  } | null>(null)
  const { toast } = useToast()
  const [testResult, setTestResult] = useState<{
    status: string
    summary?: string
    error?: string
  } | null>(null)

  useEffect(() => {
    if (policyId) {
      loadPolicy(policyId)
    }
  }, [policyId])

  const loadPolicy = async (id: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/policies/${id}`)
      if (res.ok) {
        const { policy } = await res.json()
        setName(policy.name)
        setDescription(policy.description ?? "")
        setContent(policy.content)
        setTriggerType(policy.triggerType)
        setScheduleType(policy.scheduleType ?? "WEEKLY")
        setMaxActions(policy.maxActions)

        if (policy.scheduleConfig) {
          const sc = policy.scheduleConfig
          setScheduleTime(sc.time ?? "08:00")
          if (sc.dayOfWeek !== undefined) setScheduleDayOfWeek(sc.dayOfWeek)
          if (sc.dayOfMonth !== undefined) setScheduleDayOfMonth(sc.dayOfMonth)
        }

        if (policy.triggerConfig) {
          const tc = policy.triggerConfig
          if (tc.keywords) setEmailKeywords(tc.keywords.join(", "))
          if (tc.fromFilter) setEmailFromFilter(tc.fromFilter)
        }

        if (policy.compiledPlan) {
          setCompileResult({
            success: true,
            stepCount: policy.compiledPlan.steps?.length,
          })
        } else if (policy.compileError) {
          setCompileResult({ success: false, error: policy.compileError })
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      name,
      description: description || undefined,
      content,
      triggerType,
      maxActions,
    }

    if (triggerType === "SCHEDULE") {
      payload.scheduleType = scheduleType
      const scheduleConfig: Record<string, unknown> = {
        type: scheduleType,
        time: scheduleTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }
      if (scheduleType === "WEEKLY") scheduleConfig.dayOfWeek = scheduleDayOfWeek
      if (scheduleType === "MONTHLY") scheduleConfig.dayOfMonth = scheduleDayOfMonth
      payload.scheduleConfig = scheduleConfig
    } else if (triggerType === "EMAIL_KEYWORD") {
      payload.triggerConfig = {
        type: "EMAIL_KEYWORD",
        keywords: emailKeywords.split(",").map((k) => k.trim()).filter(Boolean),
        fromFilter: emailFromFilter || undefined,
      }
    }

    return payload
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = buildPayload()
      const url = policyId ? `/api/policies/${policyId}` : "/api/policies"
      const method = policyId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        onSaved()
      }
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const handleCompile = async () => {
    if (!policyId) {
      await handleSave()
      return
    }

    setCompiling(true)
    setCompileResult(null)
    try {
      const payload = buildPayload()
      await fetch(`/api/policies/${policyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const res = await fetch(`/api/policies/${policyId}/compile`, {
        method: "POST",
      })
      if (res.ok) {
        const data = await res.json()
        setCompileResult({
          success: data.success,
          error: data.error,
          warnings: data.warnings,
          stepCount: data.plan?.steps?.length,
          suggestions: data.suggestions ?? [],
        })
      }
    } catch {
      setCompileResult({ success: false, error: "Failed to compile" })
    } finally {
      setCompiling(false)
    }
  }

  const findTextToReplace = (searchText: string, inText = content): string | null => {
    if (!searchText.trim()) return null
    if (inText.includes(searchText)) return searchText
    const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const pattern = escaped.replace(/\s+/g, "\\s+")
    try {
      const regex = new RegExp(pattern)
      const match = inText.match(regex)
      return match ? match[0] : null
    } catch {
      return null
    }
  }

  const applySuggestion = (suggestion: PolicySuggestion) => {
    const textToReplace = findTextToReplace(suggestion.currentText, content)
    if (!textToReplace) {
      toast({
        title: "Could not apply",
        description: "Text not found; it may have been edited.",
        variant: "destructive",
      })
      return
    }
    const updatedContent = content.replace(textToReplace, suggestion.suggestedFix)
    setContent(updatedContent)
    setEditorRefreshKey((prev) => prev + 1)
    setCompileResult((prev) => {
      if (!prev?.suggestions) return prev
      const remaining = prev.suggestions.filter((s) => s.id !== suggestion.id)
      return { ...prev, suggestions: remaining }
    })
    toast({
      title: "Instruction updated",
      description: "Review and recompile when ready.",
    })
  }

  const dismissSuggestion = (suggestionId: string) => {
    setCompileResult((prev) =>
      prev
        ? {
            ...prev,
            suggestions: prev.suggestions?.filter((s) => s.id !== suggestionId) ?? [],
          }
        : null,
    )
  }

  const applyAllSuggestions = () => {
    if (!compileResult?.suggestions?.length) return
    let updatedContent = content
    let appliedCount = 0
    const sorted = [...compileResult.suggestions].sort(
      (a, b) => b.currentText.length - a.currentText.length,
    )
    for (const s of sorted) {
      const textToReplace = findTextToReplace(s.currentText, updatedContent)
      if (textToReplace && updatedContent.includes(textToReplace)) {
        updatedContent = updatedContent.replace(textToReplace, s.suggestedFix)
        appliedCount += 1
      }
    }
    setContent(updatedContent)
    setEditorRefreshKey((prev) => prev + 1)
    setCompileResult((prev) => (prev ? { ...prev, suggestions: [] } : null))
    toast({
      title: "Suggestions applied",
      description:
        appliedCount > 0
          ? `${appliedCount} suggestion${appliedCount === 1 ? "" : "s"} applied. Review and recompile when ready.`
          : "Review and recompile when ready.",
    })
  }

  const handleTestRun = async () => {
    if (!policyId) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(`/api/policies/${policyId}/test`, {
        method: "POST",
      })
      if (res.ok) {
        const data = await res.json()
        setTestResult({
          status: data.status,
          summary: data.summary,
          error: data.error,
        })
      } else {
        const data = await res.json().catch(() => ({}))
        setTestResult({ status: "FAILURE", error: data.error ?? "Test run failed" })
      }
    } catch {
      setTestResult({ status: "FAILURE", error: "Network error" })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Loading policy...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h3 className="text-lg font-semibold">
          {policyId ? "Edit Policy" : "Create Policy"}
        </h3>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Name and Description */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="name">Policy Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Weekly Team Velocity Report"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what this policy does"
                />
              </div>
            </CardContent>
          </Card>

          {/* Policy Content */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Instructions</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? "Edit" : "Preview"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showPreview ? (
                <div className="prose prose-sm dark:prose-invert max-w-none min-h-[200px] p-3 border rounded-md">
                  <ReactMarkdown>{content || "*No content yet*"}</ReactMarkdown>
                </div>
              ) : (
                <Textarea
                  key={editorRefreshKey}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`Write your policy instructions in markdown...\n\n## What to do:\n1. Get all tasks completed by my team last week\n2. Calculate velocity\n3. Post summary in Slack\n\n## Success criteria:\n- Report posted by 8:05am every Monday`}
                  className="min-h-[200px] font-mono text-sm"
                />
              )}
            </CardContent>
          </Card>

          {/* Compile and Test */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleCompile}
                  disabled={compiling || !content.trim()}
                  variant="outline"
                >
                  {compiling ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Compile
                </Button>
                <Button
                  onClick={handleTestRun}
                  disabled={testing || !policyId}
                  variant="outline"
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Test Run
                </Button>
              </div>

              {compileResult && (
                <div className="mt-3 space-y-4">
                  <div
                    className={`p-3 rounded-md text-sm ${
                      compileResult.success
                        ? "bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200"
                        : "bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200"
                    }`}
                  >
                    {compileResult.success ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Compiled successfully ({compileResult.stepCount} steps)
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {compileResult.error}
                      </div>
                    )}
                  </div>

                  {compileResult.success &&
                    compileResult.suggestions &&
                    compileResult.suggestions.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium">
                            {compileResult.suggestions.length} improvement
                            {compileResult.suggestions.length > 1 ? "s" : ""} suggested
                          </h3>
                          {compileResult.suggestions.length > 1 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={applyAllSuggestions}
                            >
                              Apply All
                            </Button>
                          )}
                        </div>
                        {compileResult.suggestions.map((suggestion) => (
                          <SuggestionCard
                            key={suggestion.id}
                            suggestion={suggestion}
                            onApply={() => applySuggestion(suggestion)}
                            onDismiss={() => dismissSuggestion(suggestion.id)}
                          />
                        ))}
                      </div>
                    )}

                  {compileResult.success &&
                    (!compileResult.suggestions || compileResult.suggestions.length === 0) &&
                    (compileResult.warnings?.length ?? 0) > 0 && (
                      <div className="space-y-2">
                        {compileResult.warnings?.map((w, i) => (
                          <div
                            key={i}
                            className="p-3 bg-yellow-500/10 dark:bg-yellow-500/20 border border-yellow-500/20 rounded-md"
                          >
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                              {w}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {testResult && (
                <div className={`mt-3 p-3 rounded-md text-sm ${
                  testResult.status === "SUCCESS"
                    ? "bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200"
                    : "bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200"
                }`}>
                  <div className="font-medium">
                    Test run: {testResult.status}
                  </div>
                  {testResult.summary && (
                    <div className="mt-1 text-xs whitespace-pre-wrap">{testResult.summary}</div>
                  )}
                  {testResult.error && (
                    <div className="mt-1 text-xs">{testResult.error}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Trigger Config */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Trigger</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Trigger Type</Label>
                <Select value={triggerType} onValueChange={setTriggerType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHEDULE">Schedule</SelectItem>
                    <SelectItem value="EMAIL_KEYWORD">Email Keyword</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {triggerType === "SCHEDULE" && (
                <>
                  <div>
                    <Label>Frequency</Label>
                    <Select value={scheduleType} onValueChange={setScheduleType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAILY">Daily</SelectItem>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {scheduleType === "WEEKLY" && (
                    <div>
                      <Label>Day of Week</Label>
                      <Select
                        value={String(scheduleDayOfWeek)}
                        onValueChange={(v) => setScheduleDayOfWeek(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAY_NAMES.map((day, i) => (
                            <SelectItem key={i} value={String(i)}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {scheduleType === "MONTHLY" && (
                    <div>
                      <Label>Day of Month</Label>
                      <Select
                        value={String(scheduleDayOfMonth)}
                        onValueChange={(v) => setScheduleDayOfMonth(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 28 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </div>
                </>
              )}

              {triggerType === "EMAIL_KEYWORD" && (
                <>
                  <div>
                    <Label>Keywords (comma-separated)</Label>
                    <Input
                      value={emailKeywords}
                      onChange={(e) => setEmailKeywords(e.target.value)}
                      placeholder="meeting notes, weekly report"
                    />
                  </div>
                  <div>
                    <Label>From Filter (optional)</Label>
                    <Input
                      value={emailFromFilter}
                      onChange={(e) => setEmailFromFilter(e.target.value)}
                      placeholder="e.g., boss@company.com"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Safety Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Max Actions per Run</Label>
                <Input
                  type="number"
                  value={maxActions}
                  onChange={(e) => setMaxActions(parseInt(e.target.value) || 50)}
                  min={1}
                  max={100}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Policy will stop after this many tool calls
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving || !name.trim() || !content.trim()} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
