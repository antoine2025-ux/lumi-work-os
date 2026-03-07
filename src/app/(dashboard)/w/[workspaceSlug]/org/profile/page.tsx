/**
 * My Profile — Personal workspace and settings
 */

import { redirect } from "next/navigation";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Users, Briefcase } from "lucide-react";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { BasicInfoSection } from "@/components/org/profile/basic-info-section";
import { ReportsToSection } from "@/components/org/profile/reports-to-section";
import { EmploymentDetailsSection } from "@/components/org/profile/employment-details-section";
import { CurrentWorkloadSection } from "@/components/org/profile/current-workload-section";
import { TimeOffSectionWrapper } from "@/components/org/profile/time-off-section-wrapper";
import { PendingActionsSection } from "@/components/org/my-team/pending-actions-section";
import { WikiContributionsSection } from "@/components/org/profile/wiki-contributions-section";
import { ProfileEditButton } from "@/components/org/profile/profile-edit-button";
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
    <div className="w-full flex justify-center">
      <div className="w-full max-w-4xl px-6 pb-8">
        <OrgPageHeader
          legacyBreadcrumb="ORG / MY PROFILE"
          title="My Profile"
          description="Your personal information and settings"
          actions={
            isAdmin && primaryPosition ? (
              <ProfileEditButton
                positionId={primaryPosition.id}
                userId={context.userId}
                workspaceId={context.workspaceId}
                displayName={displayName}
                displayRole={displayRole}
                email={user?.email}
                employmentData={{
                  startDate: primaryPosition.startDate,
                  employmentType: primaryPosition.employmentType,
                  location: primaryPosition.location,
                  timezone: primaryPosition.timezone,
                }}
              />
            ) : undefined
          }
        />
        <div className="grid gap-4 pt-2">
          {/* Top row: Information | Reports to | Employment — fixed height, no expansion */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-[180px] min-w-0 overflow-hidden rounded-lg border border-border/50 bg-card/80 p-3 flex flex-col [&>*]:min-h-0">
              <BasicInfoSection
                displayName={displayName}
                displayRole={displayRole}
                email={user?.email}
                location={primaryPosition?.location}
                timezone={primaryPosition?.timezone}
              />
            </div>
            <div className="h-[180px] min-w-0 overflow-y-auto overflow-x-hidden rounded-lg border border-border/50 bg-card/80 p-3 flex flex-col [&>*]:min-h-0">
              <ReportsToSection
                workspaceSlug={workspaceSlug}
                manager={manager}
                directReports={directReports}
              />
            </div>
            <div className="h-[180px] min-w-0 overflow-hidden rounded-lg border border-border/50 bg-card/80 p-3 flex flex-col [&>*]:min-h-0">
              <EmploymentDetailsSection
                startDate={primaryPosition?.startDate}
                employmentType={primaryPosition?.employmentType}
              />
            </div>
          </div>

          {/* Current Workload | Wiki Contributions — side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CurrentWorkloadSection
              totalCapacity={workload.totalCapacity}
              allocatedHours={workload.allocatedHours}
              availableHours={workload.availableHours}
              utilizationPct={workload.utilizationPct}
              projects={workload.projects}
              workspaceSlug={workspaceSlug}
            />
            <WikiContributionsSection
              pages={wikiPages}
              totalCount={wikiPageCount}
            />
          </div>

          {/* Time Off & Availability | Pending Actions — side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Membership
            </h3>
            {teams.length > 0 ? (
              <div className="space-y-2">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <p className="font-medium text-foreground">{team.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {team.department?.name ?? "—"} Department
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        ledTeamIds.has(team.id)
                          ? "border-blue-500/50 bg-blue-500/20 text-blue-300"
                          : "border-slate-600 text-muted-foreground"
                      }
                    >
                      {ledTeamIds.has(team.id) ? "Lead" : "Member"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not assigned to any teams yet</p>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              My Responsibilities
            </h3>
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
              <p className="text-sm text-muted-foreground">
                No responsibilities defined yet.{" "}
                {isAdmin
                  ? "Add them via Positions & Roles."
                  : "Ask your admin to add them."}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
