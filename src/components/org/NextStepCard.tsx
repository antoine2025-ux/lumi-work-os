/**
 * Next Step Card Component
 * 
 * Shows a single, clear next step in the onboarding flow:
 * People → Structure → Ownership → Complete
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
import { Users, Building2, ShieldCheck } from "lucide-react";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function NextStepCard() {
  const overviewQ = useOrgQuery(() => OrgApi.getOrgOverview(), []);
  const ownershipQ = useOrgQuery(() => OrgApi.getOwnership(), []);

  // Show loading state if either query is loading
  if (overviewQ.loading || ownershipQ.loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="text-sm text-slate-400">Loading…</div>
        </CardContent>
      </Card>
    );
  }

  // Return null if either query errors (don't show incorrect state)
  if (overviewQ.error || !overviewQ.data || ownershipQ.error || !ownershipQ.data) {
    return null; // Don't show next step if data unavailable
  }

  const { summary } = overviewQ.data;
  const { peopleCount, teamCount, deptCount } = summary ?? {};
  const coverage = ownershipQ.data?.coverage;

  // Explicit availability check: prevent transient false positives during partial hydration
  const hasCoverage =
    coverage &&
    coverage.teams &&
    coverage.departments;

  if (!hasCoverage) {
    return null; // Don't show ownership card if coverage data unavailable
  }

  // Calculate unowned count from canonical ownership coverage
  const teamsUnowned = coverage.teams.total - coverage.teams.owned;
  const deptsUnowned = coverage.departments.total - coverage.departments.owned;
  const hasUnownedEntities = teamsUnowned > 0 || deptsUnowned > 0;

  // Determine next step based on onboarding flow priority:
  // 1. No people → People page
  // 2. No teams → Structure page
  // 3. No ownership → Ownership page
  let nextStep: {
    icon: typeof Users;
    title: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
  } | null = null;

  if (peopleCount === 0) {
    // No people → Add people first
    nextStep = {
      icon: Users,
      title: "Add your first person",
      description: "Start by adding people to your organization.",
      ctaLabel: "Add person",
      ctaHref: "/org/people",
    };
  } else if (teamCount === 0) {
    // No teams → Create first team
    nextStep = {
      icon: Building2,
      title: "Create your first team",
      description: "Organize your people into teams to define clear responsibilities.",
      ctaLabel: "Create team",
      ctaHref: "/org/structure",
    };
  } else if (hasUnownedEntities) {
    // Teams exist, but some have no owners → Ownership cleanup required
    nextStep = {
      icon: ShieldCheck,
      title: "Ownership cleanup required",
      description: "Some teams or departments don't have an accountable owner.",
      ctaLabel: "Fix ownership",
      ctaHref: "/org/ownership",
    };
  } else {
    // All setup steps complete — hide card entirely (no celebratory message)
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
            <h3 className="text-base font-semibold text-slate-100">{nextStep.title}</h3>
            <p className="mt-1 text-sm text-slate-400">{nextStep.description}</p>
          </div>
          <div className="flex-shrink-0">
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-white">
              <Link href={nextStep.ctaHref}>{nextStep.ctaLabel}</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

