/**
 * My Team — For users who lead at least one team OR have direct reports (managers)
 */

import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, AlertCircle, TrendingUp } from "lucide-react";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { PendingActionsSection } from "@/components/org/my-team/pending-actions-section";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function MyTeamPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const context = await getOrgPermissionContext();

  if (!context) {
    return (
      <div className="p-10">
        <Alert variant="destructive" className="border-amber-900/60 bg-amber-950/40">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>You need to be in a workspace to view your team.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const [ledTeams, managerLinks] = await Promise.all([
    prisma.orgTeam.findMany({
      where: {
        leaderId: context.userId,
        workspaceId: context.workspaceId,
      },
      include: {
        department: true,
        positions: {
          where: { isActive: true, archivedAt: null },
          include: { user: true },
        },
      },
    }),
    prisma.personManagerLink.findMany({
      where: {
        managerId: context.userId,
        workspaceId: context.workspaceId,
      },
    }),
  ]);

  const hasTeam = ledTeams.length > 0;
  const hasReports = managerLinks.length > 0;

  if (!hasTeam && !hasReports) {
    return (
      <>
        <OrgPageHeader
          legacyBreadcrumb="ORG / MY TEAM"
          title="My Team"
          description="Teams you lead or direct reports"
        />
        <div className="p-10">
          <Alert className="border-amber-900/60 bg-amber-950/40">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You must be a team lead or manager to view this page. Contact your admin to be assigned.
            </AlertDescription>
          </Alert>
        </div>
      </>
    );
  }

  const reportPersonIds = managerLinks.map((l) => l.personId);
  const teamMemberPersonIds = ledTeams.flatMap((t) =>
    t.positions.filter((p) => p.userId).map((p) => p.userId!)
  );
  const approvablePersonIds = [...new Set([...reportPersonIds, ...teamMemberPersonIds])];

  const pendingLeaveRequests =
    approvablePersonIds.length > 0
      ? await prisma.leaveRequest.findMany({
          where: {
            workspaceId: context.workspaceId,
            personId: { in: approvablePersonIds },
            status: "PENDING",
          },
          orderBy: { createdAt: "asc" },
        })
      : [];

  const userIds = new Set<string>();
  const teamMembers: Array<{
    id: string;
    userId: string;
    name: string | null;
    email: string;
    image: string | null;
    title: string | null;
    source: "team" | "report";
  }> = [];

  for (const team of ledTeams) {
    for (const pos of team.positions) {
      if (pos.userId && !userIds.has(pos.userId)) {
        userIds.add(pos.userId);
        teamMembers.push({
          id: pos.id,
          userId: pos.userId,
          name: pos.user?.name ?? null,
          email: pos.user?.email ?? "—",
          image: pos.user?.image ?? null,
          title: pos.title ?? null,
          source: "team",
        });
      }
    }
  }

  if (reportPersonIds.length > 0) {
    const reportUsers = await prisma.user.findMany({
      where: { id: { in: reportPersonIds } },
      select: { id: true, name: true, email: true, image: true },
    });
    const positions = await prisma.orgPosition.findMany({
      where: {
        userId: { in: reportPersonIds },
        workspaceId: context.workspaceId,
        isActive: true,
        archivedAt: null,
      },
      select: { id: true, userId: true, title: true },
    });
    const posByUser = Object.fromEntries(positions.map((p) => [p.userId!, p]));

    for (const u of reportUsers) {
      if (!userIds.has(u.id)) {
        userIds.add(u.id);
        const pos = posByUser[u.id];
        teamMembers.push({
          id: pos?.id ?? u.id,
          userId: u.id,
          name: u.name ?? null,
          email: u.email ?? "—",
          image: u.image ?? null,
          title: pos?.title ?? null,
          source: "report",
        });
      }
    }
  }

  const usersById = Object.fromEntries(
    teamMembers.map((m) => [m.userId, { id: m.userId, name: m.name, email: m.email, image: m.image }])
  );

  const requestsWithPerson = pendingLeaveRequests.map((r) => ({
    ...r,
    person: usersById[r.personId] ?? {
      id: r.personId,
      name: null,
      email: "—",
      image: null,
    },
  }));

  const team = ledTeams[0];
  const pageTitle = team?.name ?? "My Team";
  const pageDescription =
    team?.department ? `${team.department.name} Department` : hasTeam && hasReports ? "Team & direct reports" : "Direct reports";

  return (
    <>
      <OrgPageHeader
        legacyBreadcrumb="ORG / MY TEAM"
        title={pageTitle}
        description={pageDescription}
      />
      <div className="p-10 pb-10 max-w-6xl">
        <div className="grid gap-6">
          <PendingActionsSection requests={requestsWithPerson} workspaceSlug={workspaceSlug} />

          <Card className="border-[#1e293b] bg-[#0B1220]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-50">
                <Users className="h-5 w-5" />
                Team Members ({teamMembers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teamMembers.length > 0 ? (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <a
                      key={member.id}
                      href={`/w/${workspaceSlug}/org/people/${member.userId}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#020617] border border-[#1e293b] hover:bg-[#0B1220] transition-colors block"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[#243B7D] text-slate-100 flex items-center justify-center font-medium">
                          {member.name?.charAt(0).toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="font-medium text-slate-200">
                            {member.name ?? member.email}
                          </p>
                          <p className="text-sm text-slate-500">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.source === "report" && (
                          <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                            Direct report
                          </Badge>
                        )}
                        <Badge variant="outline" className="border-slate-600 text-slate-400">
                          {member.title ?? "Member"}
                        </Badge>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No team members yet</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#1e293b] bg-[#0B1220]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-50">
                <TrendingUp className="h-5 w-5" />
                Team Capacity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total capacity</span>
                  <span className="font-medium text-slate-200">{teamMembers.length * 40}h/week</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Allocated</span>
                  <span className="font-medium text-slate-200">—</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Available</span>
                  <span className="font-medium text-slate-200">—</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
