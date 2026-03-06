/**
 * My Profile — Personal workspace and settings
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Briefcase, GitBranch } from "lucide-react";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { BasicInfoSection } from "@/components/org/profile/basic-info-section";
import { EmploymentDetailsSection } from "@/components/org/profile/employment-details-section";
import { CurrentWorkloadSection } from "@/components/org/profile/current-workload-section";
import { TimeOffSectionWrapper } from "@/components/org/profile/time-off-section-wrapper";
import { PendingActionsSection } from "@/components/org/my-team/pending-actions-section";
import { WikiContributionsSection } from "@/components/org/profile/wiki-contributions-section";
import { getUserWorkload } from "@/lib/org/profile/get-workload";
import { getUserTimeOff } from "@/lib/org/profile/get-time-off";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function MyProfilePage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const context = await getOrgPermissionContext();

  if (!context) {
    redirect("/welcome");
  }

  const [user, positions, capacityContract, onboardingState, workload, timeOff,
         workspaceMember, managerLinks, ledTeams] =
    await Promise.all([
    prisma.user.findUnique({
      where: { id: context.userId },
      select: { name: true, email: true },
    }),
    prisma.orgPosition.findMany({
      where: {
        workspaceId: context.workspaceId,
        userId: context.userId,
        isActive: true,
        archivedAt: null,
      },
      include: {
        team: {
          include: {
            department: true,
          },
        },
      },
    }),
    prisma.capacityContract.findFirst({
      where: {
        workspaceId: context.workspaceId,
        personId: context.userId,
      },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.workspaceOnboardingState.findUnique({
      where: { workspaceId: context.workspaceId },
    }),
      getUserWorkload(context.userId, context.workspaceId),
      getUserTimeOff(context.userId, context.workspaceId),
    prisma.workspaceMember.findFirst({
      where: { userId: context.userId, workspaceId: context.workspaceId },
      select: { role: true },
    }),
    prisma.personManagerLink.findMany({
      where: { managerId: context.userId, workspaceId: context.workspaceId },
    }),
    prisma.orgTeam.findMany({
      where: { leaderId: context.userId, workspaceId: context.workspaceId },
      include: {
        positions: {
          where: { isActive: true, archivedAt: null },
          select: {
            userId: true,
            title: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    }),
    ]);

  const teams = positions
    .filter((p) => p.team)
    .map((p) => p.team!)
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);

  const ledTeamIds = new Set(ledTeams.map((t) => t.id));
  const primaryPosition = positions[0];

  // Resolve manager (who I report to)
  let manager: { name: string; userId: string; title: string | null } | null = null;
  const managerPositionId = primaryPosition?.parentId;
  if (managerPositionId) {
    const managerPosition = await prisma.orgPosition.findUnique({
      where: { id: managerPositionId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (managerPosition?.user) {
      manager = {
        name: managerPosition.user.name || managerPosition.user.email || "Unknown",
        userId: managerPosition.user.id,
        title: managerPosition.title,
      };
    }
  }

  // Build direct reports from ledTeams + managerLinks
  const directReportsMap = new Map<
    string,
    { name: string; userId: string; title: string | null }
  >();

  for (const team of ledTeams) {
    for (const pos of team.positions || []) {
      if (pos.userId && pos.userId !== context.userId && pos.user) {
        directReportsMap.set(pos.userId, {
          name: pos.user.name || pos.user.email || "Unknown",
          userId: pos.userId,
          title: pos.title,
        });
      }
    }
  }

  const managerLinkUserIds = managerLinks
    .map((ml) => ml.personId)
    .filter((id) => !directReportsMap.has(id));

  if (managerLinkUserIds.length > 0) {
    const [linkedUsers, linkedPositions] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: managerLinkUserIds } },
        select: { id: true, name: true, email: true },
      }),
      prisma.orgPosition.findMany({
        where: {
          userId: { in: managerLinkUserIds },
          workspaceId: context.workspaceId,
          isActive: true,
        },
        select: { userId: true, title: true },
      }),
    ]);
    const posMap = new Map(linkedPositions.map((p) => [p.userId, p.title]));
    for (const u of linkedUsers) {
      if (u.id) {
        directReportsMap.set(u.id, {
          name: u.name || u.email || "Unknown",
          userId: u.id,
          title: posMap.get(u.id) || null,
        });
      }
    }
  }

  const directReports = Array.from(directReportsMap.values());

  const displayName = user?.name || onboardingState?.adminName || "User";
  const displayRole = primaryPosition?.title || onboardingState?.adminRole || "Team Member";

  // Pending approvals — visible to managers (direct reports or team lead) and admins
  const isAdmin = ["ADMIN", "OWNER"].includes(workspaceMember?.role ?? "");
  const isManager = managerLinks.length > 0 || ledTeams.length > 0;
  const showPendingApprovals = isAdmin || isManager;

  const approvablePersonIds = isAdmin
    ? undefined // admin sees all workspace pending requests
    : [
        ...new Set([
          ...managerLinks.map((l) => l.personId),
          ...ledTeams.flatMap((t) =>
            t.positions.map((p) => p.userId).filter((id): id is string => id !== null)
          ),
        ]),
      ];

  const pendingLeaveRequests = showPendingApprovals
    ? await prisma.leaveRequest.findMany({
        where: {
          workspaceId: context.workspaceId,
          ...(approvablePersonIds ? { personId: { in: approvablePersonIds } } : {}),
          status: "PENDING",
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const requestUserIds = [...new Set(pendingLeaveRequests.map((r) => r.personId))];
  const requestUsers =
    requestUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: requestUserIds } },
          select: { id: true, name: true, email: true, image: true },
        })
      : [];

  const usersById = Object.fromEntries(requestUsers.map((u) => [u.id, u]));
  const requestsWithPerson = pendingLeaveRequests.map((r) => ({
    ...r,
    person: usersById[r.personId] ?? { id: r.personId, name: null, email: "—", image: null },
  }));

  const [wikiPages, wikiPageCount] = await Promise.all([
    prisma.wikiPage.findMany({
      where: { workspaceId: context.workspaceId, createdById: context.userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, slug: true, updatedAt: true, view_count: true },
    }),
    prisma.wikiPage.count({
      where: { workspaceId: context.workspaceId, createdById: context.userId },
    }),
  ]);

  return (
    <>
      <OrgPageHeader
        legacyBreadcrumb="ORG / MY PROFILE"
        title="My Profile"
        description="Your personal information and settings"
      />
      <div className="p-10 pb-10 max-w-4xl">
        <div className="grid gap-6">
          <BasicInfoSection
            displayName={displayName}
            displayRole={displayRole}
            email={user?.email}
            positionId={primaryPosition?.id}
          />

          {/* Reporting Chain */}
          <Card className="border-[#1e293b] bg-[#0B1220]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-50">
                <GitBranch className="h-5 w-5" />
                Reporting Chain
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Reports to
                </p>
                {manager ? (
                  <Link
                    href={`/w/${workspaceSlug}/org/people/${manager.userId}`}
                    className="flex items-center gap-3 rounded-lg border border-slate-700/50 p-3 hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-slate-200">
                      {manager.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{manager.name}</p>
                      {manager.title && (
                        <p className="text-xs text-slate-400">{manager.title}</p>
                      )}
                    </div>
                  </Link>
                ) : (
                  <p className="text-sm text-slate-500">No manager assigned</p>
                )}
              </div>

              {directReports.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                    Direct reports ({directReports.length})
                  </p>
                  <div className="space-y-2">
                    {directReports.map((report) => (
                      <Link
                        key={report.userId}
                        href={`/w/${workspaceSlug}/org/people/${report.userId}`}
                        className="flex items-center gap-3 rounded-lg border border-slate-700/50 p-3 hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-medium text-slate-200">
                          {report.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{report.name}</p>
                          {report.title && (
                            <p className="text-xs text-slate-400">{report.title}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <EmploymentDetailsSection
            positionId={primaryPosition?.id}
            userId={context.userId}
            workspaceId={context.workspaceId}
            startDate={primaryPosition?.startDate}
            employmentType={primaryPosition?.employmentType}
            location={primaryPosition?.location}
            timezone={primaryPosition?.timezone}
            canEdit={true}
          />

          <CurrentWorkloadSection
            totalCapacity={workload.totalCapacity}
            allocatedHours={workload.allocatedHours}
            availableHours={workload.availableHours}
            utilizationPct={workload.utilizationPct}
            projects={workload.projects}
            workspaceSlug={workspaceSlug}
          />

          {timeOff && (
            <TimeOffSectionWrapper
              timeOff={timeOff}
              userId={context.userId}
            />
          )}

          {showPendingApprovals && (
            <PendingActionsSection
              requests={requestsWithPerson}
              workspaceSlug={workspaceSlug}
            />
          )}

          <WikiContributionsSection
            pages={wikiPages}
            totalCount={wikiPageCount}
          />

          <Card className="border-[#1e293b] bg-[#0B1220]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-50">
                <Users className="h-5 w-5" />
                Team Membership
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teams.length > 0 ? (
                <div className="space-y-3">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#020617] border border-[#1e293b]"
                    >
                      <div>
                        <p className="font-medium text-slate-200">{team.name}</p>
                        <p className="text-sm text-slate-500">
                          {team.department?.name ?? "—"} Department
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          ledTeamIds.has(team.id)
                            ? "border-blue-500/50 bg-blue-500/20 text-blue-300"
                            : "border-slate-600 text-slate-400"
                        }
                      >
                        {ledTeamIds.has(team.id) ? "Lead" : "Member"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Not assigned to any teams yet</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#1e293b] bg-[#0B1220]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-50">
                <Briefcase className="h-5 w-5" />
                My Responsibilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {primaryPosition?.responsibilities &&
              primaryPosition.responsibilities.length > 0 ? (
                <ul className="space-y-2">
                  {primaryPosition.responsibilities.map((resp, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  No responsibilities defined yet.{" "}
                  {isAdmin
                    ? "Add them via Positions & Roles."
                    : "Ask your admin to add them."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
