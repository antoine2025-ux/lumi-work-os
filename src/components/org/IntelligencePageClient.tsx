"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { OrgApi, type OrgIntelligenceRollups, type OrgIntelligenceFilterPrefs, type OrgIntelligenceFinding } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "@/components/org/SeverityBadge";
import { IntelligenceSettingsEditor } from "@/components/org/IntelligenceSettingsEditor";
import { computeRollupDelta } from "@/components/org/intelligence/deltas";
import { IntelligenceFilterBar } from "@/components/org/IntelligenceFilterBar";

function matchesQuery(text: string, q: string): boolean {
  return text.toLowerCase().includes(q.toLowerCase());
}

function applyFilters<T extends { signal?: string; severity?: string; entityType?: string; title?: string; explanation?: string; description?: string }>(
  items: T[],
  prefs: OrgIntelligenceFilterPrefs,
  getSourceFinding?: (item: T) => OrgIntelligenceFinding | null
): T[] {
  return items.filter((item) => {
    const finding = getSourceFinding ? getSourceFinding(item) : (item as unknown as OrgIntelligenceFinding);

    // Filter by signal
    if (prefs.signals.length > 0 && finding?.signal) {
      if (!prefs.signals.includes(finding.signal)) return false;
    }

    // Filter by severity
    if (prefs.severities.length > 0 && finding?.severity) {
      if (!prefs.severities.includes(finding.severity)) return false;
    }

    // Filter by entity type
    if (prefs.entityTypes.length > 0 && finding?.entityType) {
      if (!prefs.entityTypes.includes(finding.entityType)) return false;
    }

    // Filter by query (text search)
    if (prefs.query) {
      const searchText = `${item.title || ""} ${item.explanation || ""} ${item.description || ""}`.trim();
      if (!matchesQuery(searchText, prefs.query)) return false;
    }

    return true;
  });
}

function computeRollupsFromFindings(
  findings: Array<{ signal: string; severity: string }>
): OrgIntelligenceRollups {
  const bySignal: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const f of findings) {
    bySignal[f.signal] = (bySignal[f.signal] || 0) + 1;
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
  }

  return {
    totals: { findings: findings.length },
    bySignal,
    bySeverity,
  };
}

function linkForFinding(f: { entityType: string; entityId: string | null }) {
  if (f.entityType === "PERSON" && f.entityId) return `/org/people/${f.entityId}`;
  if ((f.entityType === "TEAM" || f.entityType === "DEPARTMENT") && f.entityId)
    return "/org/structure";
  return "/org/structure";
}

export function IntelligencePageClient() {
  const latestQ = useOrgQuery(() => OrgApi.getLatestIntelligenceSnapshot());
  const settingsQ = useOrgQuery(() => OrgApi.getIntelligenceSettings());
  const listQ = useOrgQuery(() => OrgApi.listIntelligenceSnapshots());
  const recommendationsQ = useOrgQuery(() => OrgApi.getLatestRecommendations());

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [openWhyIds, setOpenWhyIds] = useState<Set<string>>(new Set());
  const [filterPrefs, setFilterPrefs] = useState<OrgIntelligenceFilterPrefs>({
    signals: [],
    severities: [],
    entityTypes: [],
    query: "",
  });

  async function handleGenerateSnapshot() {
    setGenerateError(null);
    setGenerateSuccess(false);
    setGenerating(true);

    try {
      await OrgApi.createIntelligenceSnapshot();
      setGenerateSuccess(true);
      // Reload page to show new snapshot
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("403") || msg.includes("Forbidden")) {
        setGenerateError("You don't have permission to generate snapshots.");
      } else if (msg.includes("401") || msg.includes("Unauthorized")) {
        setGenerateError("You must be logged in to generate snapshots.");
      } else {
        setGenerateError(msg || "Failed to generate snapshot.");
      }
    } finally {
      setGenerating(false);
    }
  }

  // Extract data early (before early returns) to ensure hooks are called consistently
  const snapshot = latestQ.data?.snapshot;
  const freshness = latestQ.data?.freshness;
  const findings = snapshot?.findings ?? [];
  // Ensure rollups always has the expected structure with safe defaults
  const rawRollups = snapshot?.rollups;
  const rollups: OrgIntelligenceRollups = rawRollups?.totals 
    ? rawRollups 
    : computeRollupsFromFindings(findings);

  // Apply filters to findings - MUST be called before early returns
  const filteredFindings = useMemo(() => {
    return applyFilters(findings, filterPrefs);
  }, [findings, filterPrefs]);

  // Apply filters to recommendations - MUST be called before early returns
  const filteredRecommendations = useMemo(() => {
    const recs = recommendationsQ.data?.recommendations || [];
    return applyFilters(recs, filterPrefs, (rec) => rec.sourceFinding);
  }, [recommendationsQ.data?.recommendations, filterPrefs]);

  // Sort by severity (HIGH first) - MUST be called before early returns
  const sortedFindings = useMemo(() => {
    const rank = (s: string) => (s === "HIGH" ? 3 : s === "MEDIUM" ? 2 : 1);
    return [...filteredFindings].sort((a, b) => rank(b.severity) - rank(a.severity));
  }, [filteredFindings]);

  // Helper functions
  function formatAge(minutes: number | null): string {
    if (minutes === null) return "";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  function freshnessBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "FRESH": return "default";
      case "STALE": return "secondary";
      case "OUTDATED": return "destructive";
      case "MISSING": return "outline";
      default: return "outline";
    }
  }

  // Early returns (after all hooks are called)
  if (latestQ.loading || settingsQ.loading)
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (latestQ.error)
    return <div className="text-sm text-destructive">Failed to load: {latestQ.error}</div>;
  
  if (!snapshot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No snapshot yet</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {freshness?.status === "MISSING" ? (
            <div className="space-y-2">
              <div>Create an intelligence snapshot to view findings.</div>
              <Button onClick={handleGenerateSnapshot} disabled={generating} size="sm">
                {generating ? "Generating…" : "Generate snapshot"}
              </Button>
            </div>
          ) : (
            "Create an intelligence snapshot to view findings."
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div></div>
        <Button asChild size="sm" variant="secondary">
          <Link href="/org/intelligence/drilldowns">Open drilldowns</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <IntelligenceFilterBar onChange={setFilterPrefs} />
          <div className="mt-2 text-sm text-muted-foreground">
            Showing {filteredFindings.length} of {findings.length} findings
            {recommendationsQ.data && (
              <> • {filteredRecommendations.length} of {recommendationsQ.data.recommendations.length} actions</>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Latest snapshot</CardTitle>
          <Button
            onClick={handleGenerateSnapshot}
            disabled={generating}
            size="sm"
          >
            {generating ? "Generating…" : "Generate snapshot"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {new Date(snapshot.createdAt).toLocaleString()} • {snapshot.findingCount} findings
            </div>
            {freshness && (
              <div className="flex items-center gap-2">
                <Badge variant={freshnessBadgeVariant(freshness.status)}>
                  {freshness.status}
                </Badge>
                {freshness.ageMinutes !== null && (
                  <span className="text-xs text-muted-foreground">
                    Age: {formatAge(freshness.ageMinutes)}
                  </span>
                )}
              </div>
            )}
          </div>
          {freshness && (freshness.status === "OUTDATED" || freshness.status === "MISSING") && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-muted-foreground">
              Snapshot is outdated. Generate a new snapshot for up-to-date insights.
            </div>
          )}
          {generateSuccess && (
            <div className="text-sm text-muted-foreground">
              Snapshot generated successfully. Refreshing…
            </div>
          )}
          {generateError && (
            <div className="text-sm text-destructive">{generateError}</div>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Rollups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="font-medium">Total findings</div>
            <div className="text-muted-foreground">{rollups.totals.findings}</div>
          </div>
          <div>
            <div className="font-medium">By severity</div>
            <div className="text-muted-foreground">
              HIGH: {rollups.bySeverity.HIGH || 0} • MEDIUM: {rollups.bySeverity.MEDIUM || 0} •
              LOW: {rollups.bySeverity.LOW || 0}
            </div>
          </div>
          <div>
            <div className="font-medium">By signal</div>
            <div className="text-muted-foreground">
              MANAGEMENT_LOAD: {rollups.bySignal.MANAGEMENT_LOAD || 0} • OWNERSHIP_RISK:{" "}
              {rollups.bySignal.OWNERSHIP_RISK || 0} • STRUCTURAL_GAP:{" "}
              {rollups.bySignal.STRUCTURAL_GAP || 0}
            </div>
          </div>
        </CardContent>
      </Card>

      <IntelligenceSettingsEditor />

      {recommendationsQ.data && filteredRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommended actions</CardTitle>
            <div className="text-sm text-muted-foreground">
              Based on latest snapshot
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredRecommendations.slice(0, 8).map((rec) => {
              const isWhyOpen = openWhyIds.has(rec.id);
              return (
                <div key={rec.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium">{rec.title}</div>
                        <SeverityBadge severity={rec.severity} />
                      </div>
                      <div className="text-sm text-muted-foreground">{rec.description}</div>
                    </div>
                  </div>
                  {isWhyOpen && (
                    <div className="mt-2 p-2 bg-muted rounded text-xs space-y-1">
                      <div className="font-medium">Source finding:</div>
                      <div>{rec.sourceFinding.title}</div>
                      <div className="text-muted-foreground">{rec.sourceFinding.explanation}</div>
                      {Object.keys(rec.sourceFinding.evidence || {}).length > 0 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-muted-foreground">
                            Evidence
                          </summary>
                          <pre className="mt-1 text-xs overflow-auto">
                            {JSON.stringify(rec.sourceFinding.evidence, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Button asChild size="sm">
                      <Link href={rec.fixHref}>Fix</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const newSet = new Set(openWhyIds);
                        if (isWhyOpen) {
                          newSet.delete(rec.id);
                        } else {
                          newSet.add(rec.id);
                        }
                        setOpenWhyIds(newSet);
                      }}
                    >
                      {isWhyOpen ? "Hide why" : "Why?"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {listQ.data && (
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {listQ.data?.snapshots.slice(0, 10).map((snap, idx) => {
                const prev = idx < (listQ.data?.snapshots.length ?? 0) - 1 ? listQ.data?.snapshots[idx + 1] : null;
                const delta = computeRollupDelta(snap.rollups, prev?.rollups || null);
                const deltaHigh = delta.bySeverity.HIGH || 0;
                const deltaTotal = delta.totalFindings;

                return (
                  <Link
                    key={snap.id}
                    href={`/org/intelligence/snapshots/${snap.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:opacity-90"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        {new Date(snap.createdAt).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {snap.source} • {snap.findingCount} findings
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className={deltaHigh > 0 ? "text-destructive" : deltaHigh < 0 ? "text-muted-foreground" : ""}>
                        Δ High: {deltaHigh > 0 ? "+" : ""}{deltaHigh}
                      </div>
                      <div className={deltaTotal > 0 ? "text-destructive" : deltaTotal < 0 ? "text-muted-foreground" : ""}>
                        Δ Total: {deltaTotal > 0 ? "+" : ""}{deltaTotal}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Findings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedFindings.length === 0 ? (
            <div className="text-sm text-muted-foreground">No findings.</div>
          ) : (
            sortedFindings.map((f, idx) => (
              <div key={`${f.signal}-${f.entityId}-${idx}`} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="font-medium">{f.title}</div>
                  <SeverityBadge severity={f.severity} />
                </div>
                <div className="text-sm text-muted-foreground mb-2">{f.explanation}</div>
                <div>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={linkForFinding(f)}>Open</Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

