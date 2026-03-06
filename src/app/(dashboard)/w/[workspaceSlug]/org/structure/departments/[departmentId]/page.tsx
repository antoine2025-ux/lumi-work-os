/**
 * Workspace-Scoped Department Detail Page
 */

export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getDepartmentById, getPeopleForOrgPicker, getDepartmentsForPicker } from "@/lib/org/queries";
import { Card } from "@/components/ui/card";
import { DepartmentPageClient } from "@/app/org/structure/departments/[departmentId]/DepartmentPageClient";
import { TeamsSectionClient } from "@/app/org/structure/departments/[departmentId]/TeamsSectionClient";
import { personDisplayName } from "@/lib/org/displayName";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";

type PageProps = {
  params: Promise<{ workspaceSlug: string; departmentId: string }>;
};

export default async function WorkspaceOrgDepartmentPage({ params }: PageProps) {
  const { workspaceSlug, departmentId } = await params;
  const ctx = await getOrgPermissionContext();
  if (!ctx) redirect("/login");

  const department = await getDepartmentById(departmentId, ctx.workspaceId);
  if (!department) return notFound();

  const people = await getPeopleForOrgPicker();
  const departmentsForPicker = await getDepartmentsForPicker();

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-6xl px-6 pt-4 pb-8">
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <div>
              <Link
                href={`/w/${workspaceSlug}/org/structure`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to Structure
              </Link>
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-semibold leading-tight">{department.name}</h1>
            <DepartmentPageClient
              department={{
                id: department.id,
                name: department.name,
                ownerId: (department as unknown as { ownerPersonId?: string | null }).ownerPersonId ?? null,
                teamCount: department.teams.length,
              }}
              people={people}
            />
          </div>

          <div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="p-6 space-y-4 lg:col-span-1">
                <div>
                  <div className="text-sm text-muted-foreground">Department owner</div>
                  <div className="mt-1 font-medium text-slate-100">
                    {personDisplayName((department as unknown as { ownerPerson?: Parameters<typeof personDisplayName>[0] }).ownerPerson) ?? "Unassigned"}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Teams</div>
                  <div className="mt-1 font-medium text-slate-100">{department.teams.length}</div>
                </div>
              </Card>

              <Card className="p-6 lg:col-span-2">
                <TeamsSectionClient
                  teams={department.teams}
                  departmentId={department.id}
                  people={people}
                  departments={departmentsForPicker}
                />
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
