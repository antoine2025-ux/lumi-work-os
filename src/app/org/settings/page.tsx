/**
 * Org Settings Landing Page
 * 
 * Directory-style landing for Org configuration:
 * - Responsibility (Phase K)
 * - Decision Authority (Phase I)
 * - Capacity Defaults (Phase G)
 * 
 * No metrics, charts, or insights. Definitions only.
 * 
 * Legacy redirect: ?tab=members|invites|general|danger → /org/workspace-settings
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { hasOrgCapability } from "@/lib/org/capabilities";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Users, Scale, Gauge } from "lucide-react";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function OrgSettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  
  // Legacy redirect: ?tab=* → /org/workspace-settings?tab=*
  const tabParam = params?.tab;
  if (tabParam) {
    const tab = Array.isArray(tabParam) ? tabParam[0] : tabParam;
    if (["members", "invites", "general", "danger"].includes(tab)) {
      redirect(`/org/workspace-settings?tab=${tab}`);
    }
  }

  const context = await getOrgPermissionContext();

  if (!context) {
    return (
      <>
        <OrgPageHeader
          title="Org Settings"
          description="Configure organizational definitions and rules."
        />
        <div className="px-10 pb-10">
          <OrgEmptyState
            title="No organization selected"
            description="You need to create or select a workspace to access settings."
            primaryActionLabel="Create workspace"
            primaryActionHref="/welcome"
          />
        </div>
      </>
    );
  }

  // Admin-only access
  const canManage = hasOrgCapability(context.role, "org:org:update");
  if (!canManage) {
    return (
      <>
        <OrgPageHeader
          title="Org Settings"
          description="Configure organizational definitions and rules."
        />
        <div className="px-10 pb-10">
          <OrgEmptyState
            title="Access restricted"
            description="You need admin permissions to access org settings."
          />
        </div>
      </>
    );
  }

  const settingsCards = [
    {
      title: "Responsibility",
      description: "Define what each role is responsible for. Used for role alignment and misassignment detection.",
      href: "/org/settings/responsibility",
      icon: Users,
    },
    {
      title: "Decision Authority",
      description: "Define who decides what and escalation paths. Used for decision authority resolution.",
      href: "/org/settings/decision-authority",
      icon: Scale,
    },
    {
      title: "Capacity Settings",
      description: "Defaults and thresholds used for capacity reasoning. Used for feasibility and overload detection.",
      href: "/org/settings/capacity",
      icon: Gauge,
    },
  ];

  return (
    <>
      <OrgPageViewTracker route="/org/settings" name="Org Settings" />
      <OrgPageHeader
        breadcrumb="ORG / SETTINGS"
        title="Org Settings"
        description="Configure organizational definitions and rules. These settings define what should be true."
      />
      <div className="px-10 pb-10">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {settingsCards.map((card) => (
            <Link key={card.href} href={card.href}>
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <card.icon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{card.title}</CardTitle>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {card.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
