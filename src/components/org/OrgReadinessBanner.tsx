/**
 * Org Readiness Banner
 *
 * Displays org semantic readiness for OWNER/ADMIN. Green when answerable,
 * yellow with blocker bullets when setup is needed.
 *
 * Data source: /api/org/snapshot (OrgSemanticSnapshotV0).
 * UI displays snapshot data only; never reinterprets.
 */

"use client";

import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { OrgPrimaryCta } from "@/components/org/ui/OrgCtaButton";
import { useCurrentOrgRole } from "@/hooks/useCurrentOrgRole";
import { useOrgSemanticSnapshot } from "@/hooks/useOrgSemanticSnapshot";
import { useOrgUrl } from "@/hooks/useOrgUrl";
import type { OrgReadinessBlocker } from "@/lib/org/snapshot/types";
import {
  deepLinkForOwnershipIssues,
  deepLinkForCapacityIssues,
  deepLinkForResponsibilityIssues,
  deepLinkForDecisionIssues,
} from "@/lib/org/issues/deepLinks";

const BLOCKER_COPY: Record<OrgReadinessBlocker, string> = {
  NO_ACTIVE_PEOPLE: "No active people",
  NO_TEAMS: "No teams configured",
  OWNERSHIP_INCOMPLETE: "Ownership incomplete",
  NO_DECISION_DOMAINS: "No decision domains",
  CAPACITY_COVERAGE_BELOW_MIN: "Capacity coverage below minimum",
  RESPONSIBILITY_PROFILES_MISSING: "Responsibility profiles missing",
  WORK_CANNOT_EVALUATE_BASELINE: "Work baseline not established",
};

export function OrgReadinessBanner({
  onboardingIncomplete = false,
}: {
  onboardingIncomplete?: boolean;
}) {
  const orgUrl = useOrgUrl();
  const { role, isLoading: roleLoading } = useCurrentOrgRole();
  const { data, isLoading: snapshotLoading, error } = useOrgSemanticSnapshot();

  // Extract workspace slug from orgUrl.base
  const workspaceSlug = orgUrl.base.split('/')[2]; // /w/{slug}/org → slug

  // Build blocker links using workspace-scoped URLs
  const BLOCKER_TO_LINK: Record<OrgReadinessBlocker, string> = {
    NO_ACTIVE_PEOPLE: orgUrl.directory,
    NO_TEAMS: orgUrl.structure,
    OWNERSHIP_INCOMPLETE: deepLinkForOwnershipIssues(workspaceSlug),
    NO_DECISION_DOMAINS: deepLinkForDecisionIssues(workspaceSlug),
    CAPACITY_COVERAGE_BELOW_MIN: deepLinkForCapacityIssues(workspaceSlug),
    RESPONSIBILITY_PROFILES_MISSING: deepLinkForResponsibilityIssues(workspaceSlug),
    WORK_CANNOT_EVALUATE_BASELINE: orgUrl.path("onboarding/work"),
  };

  if (roleLoading || snapshotLoading || error || !data) {
    return null;
  }

  if (role !== "OWNER" && role !== "ADMIN") {
    return null;
  }

  const { readiness } = data;
  const displayBlockers = readiness.blockers.slice(0, 3);

  if (readiness.isAnswerable) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-950/20 mb-6">
        <div className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <span className="text-sm font-medium text-emerald-100">
            Org readiness: Answerable
          </span>
        </div>
      </Card>
    );
  }

  const ctaHref =
    onboardingIncomplete && readiness.blockers.includes("WORK_CANNOT_EVALUATE_BASELINE")
      ? orgUrl.path("onboarding/work")
      : displayBlockers.length > 0
        ? BLOCKER_TO_LINK[displayBlockers[0]]
        : orgUrl.adminHealth;
  const ctaLabel =
    onboardingIncomplete && readiness.blockers.includes("WORK_CANNOT_EVALUATE_BASELINE")
      ? "Resume onboarding"
      : "View issues";

  return (
    <Card className="border-amber-500/30 bg-amber-950/20 mb-6">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-amber-100">
                Needs setup
              </span>
              <ul className="mt-2 space-y-1 text-xs text-amber-200/90">
                {displayBlockers.map((b) => (
                  <li key={b}>• {BLOCKER_COPY[b]}</li>
                ))}
              </ul>
            </div>
          </div>
          <OrgPrimaryCta size="sm" asChild>
            <Link href={ctaHref} className="shrink-0">
              {ctaLabel}
            </Link>
          </OrgPrimaryCta>
        </div>
      </div>
    </Card>
  );
}
