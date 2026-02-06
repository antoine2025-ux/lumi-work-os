"use client";

/**
 * O1: Resume Onboarding Card
 *
 * Shown on the Overview page for OWNER users when onboarding has not been
 * completed (orgCenterOnboardingCompletedAt is null). Provides a persistent
 * affordance to resume the onboarding flow after using ?skipOnboarding=true.
 */

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { OrgPrimaryCta } from "@/components/org/ui/OrgCtaButton";
import { Rocket } from "lucide-react";

export function OnboardingResumeCard() {
  return (
    <Card className="border-blue-600/30 bg-blue-950/10">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Rocket className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Finish setting up your org</p>
            <p className="text-xs text-muted-foreground">
              Ask a work question to help the system understand what your team needs.
            </p>
          </div>
          <OrgPrimaryCta size="sm" asChild>
            <Link href="/org/onboarding/work">Resume onboarding</Link>
          </OrgPrimaryCta>
        </div>
      </CardContent>
    </Card>
  );
}
