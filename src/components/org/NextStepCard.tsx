/**
 * Next Step Card Component
 * 
 * Shows a single, clear next step in the onboarding flow:
 * People → Structure → Ownership → Work → Complete
 * 
 * HARD RULE: NextStepCard must not appear for Ownership if Ownership coverage is 100%.
 * This means: teamsOwned === teamsTotal AND departmentsOwned === departmentsTotal.
 * 
 * No exceptions. This mirrors enforcement elsewhere:
 * - No fake issues
 * - No fake entities
 * - No fake fixes
 * 
 * If this rule is violated, it is a bug, not a UX decision.
 */

"use client";

import Link from "next/link";
import { Users, Building2, ShieldCheck, Briefcase } from "lucide-react";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

// Lightweight fetchers for Work step guards
async function fetchWorkRequestCount(): Promise<number> {
  try {
    const res = await fetch("/api/org/work/requests?status=OPEN");
    if (!res.ok) return -1;
    const data = await res.json();
    return data.count ?? data.requests?.length ?? 0;
  } catch {
    return -1;
  }
}

async function fetchDecisionDomainCount(): Promise<number> {
  try {
    const res = await fetch("/api/org/decision/domains");
    if (!res.ok) return -1;
    const data = await res.json();
    const domains = data.domains ?? [];
    // Only count active (non-archived) domains
    return domains.filter((d: { isArchived?: boolean }) => !d.isArchived).length;
  } catch {
    return -1;
  }
}

export function NextStepCard() {
  const overviewQ = useOrgQuery(() => OrgApi.getOrgOverview(), []);
  const ownershipQ = useOrgQuery(() => OrgApi.getOwnership(), []);

  // Work step data (only fetched when ownership is complete)
  const [workData, setWorkData] = useState<{
    workRequestCount: number;
    domainCount: number;
    loaded: boolean;
  }>({ workRequestCount: 0, domainCount: 0, loaded: false });

  // Determine if we need to fetch work data
  const ownershipLoaded = !overviewQ.loading && !ownershipQ.loading && overviewQ.data && ownershipQ.data;
  const summary = overviewQ.data?.summary;
  const coverage = ownershipQ.data?.coverage;
  const hasCoverage = coverage?.teams && coverage?.departments;
  const hasUnownedEntities = hasCoverage
    ? (coverage.teams.total - coverage.teams.owned > 0 || coverage.departments.total - coverage.departments.owned > 0)
    : false;
  const ownershipComplete = ownershipLoaded && hasCoverage && !hasUnownedEntities
    && (summary?.peopleCount ?? 0) > 0 && (summary?.teamCount ?? 0) > 0;

  useEffect(() => {
    if (!ownershipComplete || workData.loaded) return;
    let cancelled = false;
    Promise.all([fetchWorkRequestCount(), fetchDecisionDomainCount()]).then(
      ([wrc, dc]) => {
        if (!cancelled) setWorkData({ workRequestCount: wrc, domainCount: dc, loaded: true });
      }
    );
    return () => { cancelled = true; };
  }, [ownershipComplete, workData.loaded]);

  // Show loading state if core queries are loading
  if (overviewQ.loading || ownershipQ.loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="text-sm text-muted-foreground">Loading…</div>
        </CardContent>
      </Card>
    );
  }

  // Return null if either query errors (don't show incorrect state)
  if (overviewQ.error || !overviewQ.data || ownershipQ.error || !ownershipQ.data) {
    return null;
  }

  const { peopleCount, teamCount } = summary ?? {};

  if (!hasCoverage) {
    return null; // Don't show ownership card if coverage data unavailable
  }

  // Determine next step based on onboarding flow priority:
  // 1. No people → People page
  // 2. No teams → Structure page
  // 3. No ownership → Ownership page
  // 4. No work requests (and domains exist) → Work page
  let nextStep: {
    icon: typeof Users;
    title: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
  } | null = null;

  if (peopleCount === 0) {
    nextStep = {
      icon: Users,
      title: "Add your first person",
      description: "Start by adding people to your organization.",
      ctaLabel: "Add person",
      ctaHref: "/org/people",
    };
  } else if (teamCount === 0) {
    nextStep = {
      icon: Building2,
      title: "Create your first team",
      description: "Organize your people into teams to define clear responsibilities.",
      ctaLabel: "Create team",
      ctaHref: "/org/structure",
    };
  } else if (hasUnownedEntities) {
    nextStep = {
      icon: ShieldCheck,
      title: "Ownership cleanup required",
      description: "Some teams or departments don't have an accountable owner.",
      ctaLabel: "Fix ownership",
      ctaHref: "/org/ownership",
    };
  } else if (ownershipComplete && workData.loaded
    && workData.domainCount > 0 && workData.workRequestCount === 0) {
    // Ownership complete, decision domains exist, but no work requests yet
    nextStep = {
      icon: Briefcase,
      title: "Ask your first work question",
      description: "Submit a work request to see staffing recommendations based on your org's capacity.",
      ctaLabel: "New work request",
      ctaHref: "/org/work",
    };
  } else {
    // All steps complete or prerequisites not met — hide card
    return null;
  }

  if (!nextStep) {
    return null;
  }

  const Icon = nextStep.icon;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground">{nextStep.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{nextStep.description}</p>
          </div>
          <div className="flex-shrink-0">
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-foreground">
              <Link href={nextStep.ctaHref}>{nextStep.ctaLabel}</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

