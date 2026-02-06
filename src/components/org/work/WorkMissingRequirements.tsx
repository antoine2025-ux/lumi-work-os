"use client";

/**
 * O1: Work Missing Requirements - Guided Fix Section
 *
 * Renders structural gaps the system needs filled to answer the work question.
 * Each gap has a message and a CTA deep-linking to the relevant configuration page.
 *
 * Renders nothing when missingRequirements is undefined/empty.
 */

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { OrgPrimaryCta } from "@/components/org/ui/OrgCtaButton";
import { AlertTriangle, Layers, Users, Shield } from "lucide-react";
import type { WorkFeasibilityResult } from "@/lib/org/work/types";

type MissingRequirements = NonNullable<WorkFeasibilityResult["missingRequirements"]>;

type Props = {
  missingRequirements: MissingRequirements | undefined;
  workRequestId: string;
};

export function WorkMissingRequirements({ missingRequirements, workRequestId }: Props) {
  if (!missingRequirements) return null;

  const hasDecisionDomain = missingRequirements.decisionDomain === true;
  const capacityRoles = missingRequirements.capacityForRoles ?? [];
  const responsibilityRoles = missingRequirements.responsibilityProfiles ?? [];

  const totalMissing =
    (hasDecisionDomain ? 1 : 0) +
    (capacityRoles.length > 0 ? 1 : 0) +
    (responsibilityRoles.length > 0 ? 1 : 0);

  if (totalMissing === 0) return null;

  const returnTo = encodeURIComponent(`/org/work/${workRequestId}`);

  return (
    <div id="missing-requirements" className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span>What&apos;s missing?</span>
      </div>

      {hasDecisionDomain && (
        <MissingCard
          icon={<Layers className="h-4 w-4 text-blue-400" />}
          message="To decide this work, you need a decision domain."
          ctaLabel="Create decision domain"
          href={`/org/settings/decision-authority?returnTo=${returnTo}`}
        />
      )}

      {capacityRoles.length > 0 && (
        <MissingCard
          icon={<Users className="h-4 w-4 text-emerald-400" />}
          message={
            capacityRoles.length === 1
              ? `We can't assess capacity for role: ${capacityRoles[0]}.`
              : `We can't assess capacity for roles: ${capacityRoles.join(", ")}.`
          }
          ctaLabel="Set capacity for this role"
          href={`/org/people?openCapacity=true&roles=${capacityRoles.map(encodeURIComponent).join(",")}&returnTo=${returnTo}`}
        />
      )}

      {responsibilityRoles.length > 0 && (
        <MissingCard
          icon={<Shield className="h-4 w-4 text-violet-400" />}
          message={
            responsibilityRoles.length === 1
              ? `Role responsibilities for ${responsibilityRoles[0]} are undefined.`
              : `Role responsibilities for ${responsibilityRoles.join(", ")} are undefined.`
          }
          ctaLabel="Define role responsibilities"
          href={`/org/settings/responsibility?roleType=${encodeURIComponent(responsibilityRoles[0])}&returnTo=${returnTo}`}
        />
      )}
    </div>
  );
}

function MissingCard({
  icon,
  message,
  ctaLabel,
  href,
}: {
  icon: React.ReactNode;
  message: string;
  ctaLabel: string;
  href: string;
}) {
  return (
    <Card className="border-slate-800 bg-slate-950/40">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">{icon}</div>
          <p className="text-[12px] text-slate-300">{message}</p>
        </div>
        <OrgPrimaryCta size="sm" asChild className="flex-shrink-0 text-[12px]">
          <Link href={href}>{ctaLabel}</Link>
        </OrgPrimaryCta>
      </CardContent>
    </Card>
  );
}
