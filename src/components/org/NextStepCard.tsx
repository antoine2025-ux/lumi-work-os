/**
 * Next Step Card Component
 * 
 * Shows a single, clear next step in the onboarding flow:
 * People → Structure → Ownership → Complete
 */

"use client";

import Link from "next/link";
import { CheckCircle2, Users, Building2, ShieldCheck } from "lucide-react";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NextStepCard() {
  const overviewQ = useOrgQuery(() => OrgApi.getOrgOverview(), []);

  if (overviewQ.loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-slate-400">Loading…</div>
        </CardContent>
      </Card>
    );
  }

  if (overviewQ.error || !overviewQ.data) {
    return null; // Don't show next step if data unavailable
  }

  const { summary, readiness } = overviewQ.data;
  const { peopleCount, teamCount, deptCount, unownedEntities } = summary;

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
  } else if (unownedEntities > 0) {
    // Teams exist, but some have no owners → Assign ownership
    nextStep = {
      icon: ShieldCheck,
      title: "Assign ownership",
      description: `Assign owners to ${unownedEntities} unowned ${unownedEntities === 1 ? "entity" : "entities"}.`,
      ctaLabel: "Assign ownership",
      ctaHref: "/org/ownership",
    };
  } else {
    // All setup steps complete
    return (
      <Card className="border-green-500/20 bg-green-950/10">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-100">Org setup complete</h3>
              <p className="mt-1 text-sm text-slate-400">
                Your organization is set up. All people, structure, and ownership are configured.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!nextStep) {
    return null;
  }

  const Icon = nextStep.icon;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-6">
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

