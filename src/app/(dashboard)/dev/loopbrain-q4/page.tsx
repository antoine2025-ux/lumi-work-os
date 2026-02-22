"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Q4AssessmentResult {
  assessment?: string;
  confidence?: string;
  capacitySummary?: string;
  assumptions?: string[];
  risks?: string[];
  constraints?: string[];
  timeframe?: { start: string; end: string };
}

export default function LoopbrainQ4TestPage() {
  const [projectId, setProjectId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Q4AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Guard: Hide in production
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>Not Available</CardTitle>
            <CardDescription>This page is only available in development mode.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!projectId) {
        setError("Project ID is required");
        setLoading(false);
        return;
      }

      if (!endDate && !durationDays) {
        setError("Either end date or duration days is required");
        setLoading(false);
        return;
      }

      let url = `/api/loopbrain/org/q4?projectId=${encodeURIComponent(projectId)}`;

      if (startDate) {
        url += `&start=${encodeURIComponent(new Date(startDate).toISOString())}`;
      }

      if (endDate) {
        url += `&end=${encodeURIComponent(new Date(endDate).toISOString())}`;
      } else if (durationDays) {
        url += `&durationDays=${encodeURIComponent(durationDays)}`;
      }

      const response = await fetch(url);

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setError(data.errors.map((e: { message: string }) => e.message).join(", "));
        } else {
          setError(data.error || "Request failed");
        }
        setLoading(false);
        return;
      }

      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch assessment");
    } finally {
      setLoading(false);
    }
  };

  // Set default start date to now
  const getDefaultStartDate = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Loopbrain Q4 Test Harness</CardTitle>
          <CardDescription>
            Test capacity feasibility assessment for a project and timeframe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="projectId">Project ID *</Label>
              <Input
                id="projectId"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="proj_123..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate || getDefaultStartDate()}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Default: current date/time
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (e.target.value) setDurationDays("");
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="durationDays">Duration (days)</Label>
                <Input
                  id="durationDays"
                  type="number"
                  min="1"
                  value={durationDays}
                  onChange={(e) => {
                    setDurationDays(e.target.value);
                    if (e.target.value) setEndDate("");
                  }}
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Provide either end date or duration days (not both)
            </p>

            <Button type="submit" disabled={loading}>
              {loading ? "Running assessment..." : "Run Assessment"}
            </Button>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Assessment Result</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-muted-foreground">
                      Assessment
                    </div>
                    <div className="text-2xl font-bold capitalize">
                      {result.assessment?.replace(/_/g, " ")}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-muted-foreground">
                      Confidence
                    </div>
                    <div className="text-lg capitalize">{result.confidence}</div>
                  </div>

                  {result.capacitySummary && (
                    <div>
                      <div className="text-sm font-semibold text-muted-foreground">
                        Capacity Summary
                      </div>
                      <div>{result.capacitySummary}</div>
                    </div>
                  )}

                  {result.assumptions && result.assumptions.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-muted-foreground">
                        Assumptions
                      </div>
                      <ul className="list-disc list-inside space-y-1">
                        {result.assumptions.map((a: string, i: number) => (
                          <li key={i} className="text-sm">
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.risks && result.risks.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-muted-foreground">
                        Risks
                      </div>
                      <ul className="list-disc list-inside space-y-1">
                        {result.risks.map((r: string, i: number) => (
                          <li key={i} className="text-sm text-yellow-600 dark:text-yellow-400">
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.constraints && result.constraints.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-muted-foreground">
                        Constraints
                      </div>
                      <ul className="list-disc list-inside space-y-1">
                        {result.constraints.map((c: string, i: number) => (
                          <li key={i} className="text-sm text-orange-600 dark:text-orange-400">
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.timeframe && (
                    <div>
                      <div className="text-sm font-semibold text-muted-foreground">
                        Timeframe
                      </div>
                      <div className="text-sm">
                        <div>Start: {new Date(result.timeframe.start).toLocaleString()}</div>
                        <div>End: {new Date(result.timeframe.end).toLocaleString()}</div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-semibold text-muted-foreground mb-2">
                      Full JSON Response
                    </div>
                    <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

