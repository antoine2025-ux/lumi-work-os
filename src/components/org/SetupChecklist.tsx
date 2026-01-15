/**
 * Setup Checklist Component
 * 
 * Displays a linear checklist of Org setup steps with completion status.
 * Uses the readiness evaluator to compute deterministic status from API data.
 */

"use client";

import { useRouter } from "next/navigation";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrgSectionLoading, OrgSectionError, OrgSectionEmpty } from "@/components/org/OrgSectionState";

export function SetupChecklist() {
  const router = useRouter();
  const overviewQ = useOrgQuery(() => OrgApi.getOrgOverview(), []);

  const loading = overviewQ.loading;
  const error = overviewQ.error;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <OrgSectionLoading label="setup checklist" />
        </CardContent>
      </Card>
    );
  }

  if (error || !overviewQ.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <OrgSectionError title="Setup" message={error || "Failed to load setup status"} />
        </CardContent>
      </Card>
    );
  }

  // Convert server-side readiness to checklist items format
  const readiness = overviewQ.data.readiness;
  const summary = overviewQ.data.summary;
  
  // Show empty state if no people added yet
  if (summary.peopleCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <OrgSectionEmpty
            title="Get started"
            description="Add your first person to begin setting up your organization."
            ctaLabel="Add person"
            ctaHref="/org/people/new"
          />
        </CardContent>
      </Card>
    );
  }
  
  // Build checklist items matching computeOrgReadiness format
  const items = [
    {
      key: "people_added",
      title: "Add people",
      description: "Add at least one person to your organization.",
      complete: readiness.people_added,
      meta: summary.peopleCount > 0 ? `${summary.peopleCount} people added` : undefined,
      href: "/org/people/new",
      ctaLabel: "Add person",
    },
    {
      key: "structure_defined",
      title: "Define structure",
      description: "Create at least one team or department.",
      complete: readiness.structure_defined,
      meta: summary.teamCount + summary.deptCount > 0 ? `${summary.teamCount} teams, ${summary.deptCount} departments` : undefined,
      href: "/org/structure",
      ctaLabel: "Define structure",
    },
    {
      key: "ownership_assigned",
      title: "Assign ownership",
      description: "Assign owners to all teams and departments.",
      complete: readiness.ownership_assigned,
      meta: summary.unownedEntities > 0 ? `${summary.unownedEntities} unowned entities` : undefined,
      href: "/org/ownership",
      ctaLabel: "Assign ownership",
    },
  ];
  
  const ready = readiness.people_added && readiness.structure_defined && readiness.ownership_assigned;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Setup</CardTitle>
        <Badge variant={ready ? "secondary" : "destructive"}>
          {ready ? "Org ready" : "Setup required"}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          {ready
            ? "Org is complete enough to be treated as a source of truth."
            : "Complete these steps to make Org reliable for Loopbrain and your team."}
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.key} className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{item.title}</div>
                  <Badge variant={item.complete ? "secondary" : "outline"}>
                    {item.complete ? "Complete" : "Incomplete"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
                {item.meta && <div className="text-xs text-muted-foreground">{item.meta}</div>}
              </div>

              <Button 
                size="sm" 
                variant={item.complete ? "secondary" : "default"}
                onClick={() => router.push(item.href)}
              >
                {item.ctaLabel}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

