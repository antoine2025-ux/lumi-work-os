"use client";

import Link from "next/link";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/org/SeverityBadge";

export function SnapshotDetailClient({ snapshotId }: { snapshotId: string }) {
  const q = useOrgQuery(() => OrgApi.getIntelligenceSnapshot(snapshotId));

  if (q.loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (q.error) return <div className="text-sm text-destructive">Failed to load: {q.error}</div>;
  if (!q.data) {
    return <div className="text-sm text-muted-foreground">Snapshot not found.</div>;
  }

  const snap = q.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Snapshot</h1>
        <p className="text-sm text-muted-foreground">Intelligence snapshot details.</p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/org/intelligence">Back</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {new Date(snap.createdAt).toLocaleString()} • Source: {snap.source} • Findings:{" "}
            {snap.findingCount}
          </CardContent>
        </Card>

        {snap.rollups && (
          <Card>
            <CardHeader>
              <CardTitle>Rollups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">By severity</div>
                <div className="text-muted-foreground">
                  HIGH: {snap.rollups.bySeverity.HIGH || 0} • MEDIUM:{" "}
                  {snap.rollups.bySeverity.MEDIUM || 0} • LOW: {snap.rollups.bySeverity.LOW || 0}
                </div>
              </div>
              <div>
                <div className="font-medium">By signal</div>
                <div className="text-muted-foreground">
                  {Object.entries(snap.rollups.bySignal).map(([k, v], idx, arr) => (
                    <span key={k}>
                      {k}: {v}
                      {idx < arr.length - 1 ? " • " : ""}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Findings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {snap.findings.length === 0 ? (
              <div className="text-sm text-muted-foreground">No findings.</div>
            ) : (
              snap.findings.map((f, idx) => (
                <div key={`${f.signal}-${f.entityId}-${idx}`} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="font-medium">{f.title}</div>
                    <SeverityBadge severity={f.severity} />
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">{f.explanation}</div>
                  <div>
                    <Button asChild size="sm" variant="secondary">
                      <Link
                        href={
                          f.entityType === "PERSON" && f.entityId
                            ? `/org/people/${f.entityId}`
                            : "/org/structure"
                        }
                      >
                        Open
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
