"use client";

import Link from "next/link";
import { OrgApi, type OrgIntelligenceFinding } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/org/SeverityBadge";
import { filterBySignal, sortBySeverityDesc } from "@/components/org/intelligence/filters";

function openHref(f: OrgIntelligenceFinding) {
  if (f.entityType === "PERSON" && f.entityId) return `/org/people/${f.entityId}`;
  if ((f.entityType === "TEAM" || f.entityType === "DEPARTMENT") && f.entityId)
    return "/org/structure";
  return "/org";
}

function fixHref(f: OrgIntelligenceFinding) {
  if (f.signal === "OWNERSHIP_RISK") return "/org/ownership";
  if (f.signal === "MANAGEMENT_LOAD") return f.entityId ? `/org/people/${f.entityId}` : "/org/people";
  return "/org/intelligence";
}

export function IntelligenceDrilldownsClient() {
  const latestQ = useOrgQuery(() => OrgApi.getLatestIntelligenceSnapshot());

  if (latestQ.loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (latestQ.error)
    return <div className="text-sm text-destructive">Failed to load: {latestQ.error}</div>;

  const snapshot = latestQ.data?.snapshot;
  if (!snapshot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No snapshot</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Generate an intelligence snapshot to view drilldowns.
          <div className="mt-2">
            <Button asChild size="sm">
              <Link href="/org/intelligence">Open Intelligence</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const findings = snapshot.findings;

  const managementLoad = sortBySeverityDesc(filterBySignal(findings, "MANAGEMENT_LOAD")).slice(
    0,
    12
  );
  const ownershipRisk = sortBySeverityDesc(filterBySignal(findings, "OWNERSHIP_RISK")).slice(0, 12);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Management load hotspots</CardTitle>
          <Button asChild size="sm" variant="secondary">
            <Link href="/org/intelligence">Back to Intelligence</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {managementLoad.length === 0 ? (
            <div className="text-sm text-muted-foreground">No management load findings.</div>
          ) : (
            managementLoad.map((f, idx) => (
              <div key={`ml-${f.signal}-${f.entityId}-${idx}`} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="font-medium">{f.title}</div>
                  <SeverityBadge severity={f.severity} />
                </div>
                <div className="text-sm text-muted-foreground">{f.explanation}</div>
                <div className="mt-2 flex gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link href={openHref(f)}>Open</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={fixHref(f)}>Fix</Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ownership risk</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ownershipRisk.length === 0 ? (
            <div className="text-sm text-muted-foreground">No ownership risk findings.</div>
          ) : (
            ownershipRisk.map((f, idx) => (
              <div key={`own-${f.signal}-${f.entityId}-${idx}`} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="font-medium">{f.title}</div>
                  <SeverityBadge severity={f.severity} />
                </div>
                <div className="text-sm text-muted-foreground">{f.explanation}</div>
                <div className="mt-2 flex gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link href={openHref(f)}>Open</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={fixHref(f)}>Fix</Link>
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

