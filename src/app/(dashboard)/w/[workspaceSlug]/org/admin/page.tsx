/**
 * Org Admin — Health & Issues dashboard (admin only)
 */

import { redirect } from "next/navigation";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { assertAccess } from "@/lib/auth/assertAccess";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Users, Building2, Briefcase, Activity } from "lucide-react";
import Link from "next/link";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgContextSyncButton } from "@/components/loopbrain/OrgContextSyncButton";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function AdminHealthPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const context = await getOrgPermissionContext();

  if (!context) {
    redirect("/welcome");
  }

  try {
    await assertAccess({
      userId: context.userId,
      workspaceId: context.orgId,
      scope: "workspace",
      requireRole: ["OWNER", "ADMIN"],
    });
  } catch {
    redirect(`/w/${workspaceSlug}/org/profile`);
  }

  const [peopleCount, departmentsCount, teamsCount, roleCardsCount] = await Promise.all([
    prisma.workspaceMember.count({
      where: { workspaceId: context.orgId },
    }),
    prisma.orgDepartment.count({ where: { workspaceId: context.orgId } }),
    prisma.orgTeam.count({ where: { workspaceId: context.orgId } }),
    prisma.roleCard.count({ where: { workspaceId: context.orgId } }),
  ]);

  const issues: { type: string; severity: "high" | "medium" | "low" }[] = [];
  if (peopleCount === 0) issues.push({ type: "No active people", severity: "high" });
  if (departmentsCount === 0) issues.push({ type: "No departments configured", severity: "high" });
  if (teamsCount === 0) issues.push({ type: "No teams configured", severity: "medium" });
  if (roleCardsCount === 0) issues.push({ type: "No role cards defined", severity: "low" });

  return (
    <>
      <OrgPageHeader
        breadcrumb="ORG / ADMIN"
        title="Org Health & Issues"
        description="Monitor organizational health and resolve structural issues"
      />
      <div className="p-10 pb-10 max-w-6xl">
        {issues.length > 0 ? (
          <Alert variant="destructive" className="mb-6 border-amber-900/60 bg-amber-950/40">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>
              {issues.length} issue{issues.length > 1 ? "s" : ""} detected that need attention
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6 border-slate-700 bg-slate-900/50">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>All Clear</AlertTitle>
            <AlertDescription>No structural issues detected</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card className="border-[#1e293b] bg-[#0B1220]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">People</CardTitle>
              <Users className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-50">{peopleCount}</div>
              <Link
                href={`/w/${workspaceSlug}/org/directory`}
                className="text-xs text-slate-500 hover:underline hover:text-slate-400"
              >
                View directory →
              </Link>
            </CardContent>
          </Card>

          <Card className="border-[#1e293b] bg-[#0B1220]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Departments</CardTitle>
              <Building2 className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-50">{departmentsCount}</div>
              <Link
                href={`/w/${workspaceSlug}/org/structure`}
                className="text-xs text-slate-500 hover:underline hover:text-slate-400"
              >
                View structure →
              </Link>
            </CardContent>
          </Card>

          <Card className="border-[#1e293b] bg-[#0B1220]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Teams</CardTitle>
              <Users className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-50">{teamsCount}</div>
              <Link
                href={`/w/${workspaceSlug}/org/structure`}
                className="text-xs text-slate-500 hover:underline hover:text-slate-400"
              >
                View structure →
              </Link>
            </CardContent>
          </Card>

          <Card className="border-[#1e293b] bg-[#0B1220]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Positions</CardTitle>
              <Briefcase className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-50">{roleCardsCount}</div>
              <Link
                href={`/w/${workspaceSlug}/org/positions`}
                className="text-xs text-slate-500 hover:underline hover:text-slate-400"
              >
                View positions →
              </Link>
            </CardContent>
          </Card>
        </div>

        {issues.length > 0 && (
          <Card className="border-[#1e293b] bg-[#0B1220]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-50">
                <Activity className="h-5 w-5" />
                What Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {issues.map((issue, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border border-[#1e293b]"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle
                        className={`h-5 w-5 shrink-0 ${
                          issue.severity === "high"
                            ? "text-red-500"
                            : issue.severity === "medium"
                              ? "text-amber-500"
                              : "text-blue-500"
                        }`}
                      />
                      <div>
                        <p className="font-medium text-slate-200">{issue.type}</p>
                        <p className="text-sm text-slate-500">
                          {issue.severity === "high" && "Critical — Address immediately"}
                          {issue.severity === "medium" && "Important — Address soon"}
                          {issue.severity === "low" && "Optional — Improve when possible"}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">
                      Fix
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6">
          <OrgContextSyncButton />
        </div>
      </div>
    </>
  );
}
