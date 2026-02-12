/**
 * My Profile — Personal workspace and settings
 */

import { redirect } from "next/navigation";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Calendar, Users, Briefcase } from "lucide-react";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { EmploymentDetailsSection } from "@/components/org/profile/employment-details-section";
import { CurrentWorkloadSection } from "@/components/org/profile/current-workload-section";
import { TimeOffSectionWrapper } from "@/components/org/profile/time-off-section-wrapper";
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

  const [user, positions, capacityContract, onboardingState, workload, timeOff] =
    await Promise.all([
    prisma.user.findUnique({
      where: { id: context.userId },
      select: { name: true, email: true },
    }),
    prisma.orgPosition.findMany({
      where: {
        workspaceId: context.orgId,
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
        workspaceId: context.orgId,
        personId: context.userId,
      },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.workspaceOnboardingState.findUnique({
      where: { workspaceId: context.orgId },
    }),
      getUserWorkload(context.userId, context.orgId),
      getUserTimeOff(context.userId, context.orgId),
    ]);

  const teams = positions
    .filter((p) => p.team)
    .map((p) => p.team!)
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);

  const primaryPosition = positions[0];

  const displayName = user?.name || onboardingState?.adminName || "User";
  const displayRole = onboardingState?.adminRole || "Team Member";

  return (
    <>
      <OrgPageHeader
        breadcrumb="ORG / MY PROFILE"
        title="My Profile"
        description="Your personal information and settings"
      />
      <div className="p-10 pb-10 max-w-4xl">
        <div className="grid gap-6">
          <Card className="border-[#1e293b] bg-[#0B1220]">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-full bg-[#243B7D] text-slate-100 flex items-center justify-center text-2xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-slate-50">{displayName}</h2>
                  <p className="text-slate-400">{displayRole}</p>
                  {user?.email && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </div>
                  )}
                </div>
                <Button variant="outline" className="border-slate-600 text-slate-300">
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          <EmploymentDetailsSection
            positionId={primaryPosition?.id}
            userId={context.userId}
            workspaceId={context.orgId}
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
