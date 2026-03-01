/**
 * My Profile — Personal workspace and settings
 */

import { redirect } from "next/navigation";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Briefcase } from "lucide-react";
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
          select: { userId: true },
        },
      },
    }),
    ]);

  const teams = positions
    .filter((p) => p.team)
    .map((p) => p.team!)
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);

  const primaryPosition = positions[0];

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
                      <Badge variant="outline" className="border-slate-600 text-slate-400">
                        Member
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
                <Calendar className="h-5 w-5" />
                Capacity & Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Weekly capacity</span>
                  <span className="font-medium text-slate-200">
                    {capacityContract?.weeklyCapacityHours ?? 40}h/week
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Current workload</span>
                  <span className="font-medium text-slate-200">—</span>
                </div>
              </div>
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
              <p className="text-sm text-slate-500">No responsibilities defined yet</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
