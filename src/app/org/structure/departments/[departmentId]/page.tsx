/**
 * Department Detail Page - Server Component
 * 
 * Shows department details, teams, and ownership information.
 * Edit-ready layout with drawer for editing.
 */

export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getDepartmentById, getPeopleForOrgPicker, getDepartmentsForPicker } from "@/lib/org/queries";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { Card } from "@/components/ui/card";
import { DepartmentPageClient } from "./DepartmentPageClient";
import { TeamsSectionClient } from "./TeamsSectionClient";
import { personDisplayName } from "@/lib/org/displayName";

/**
 * Server-compatible function to resolve back action based on the `from` query parameter.
 * This is a server-side version of the client-side resolveBackAction function.
 */
function resolveBackActionServer(from: string | null): { label: string; href: string } | null {
  if (!from) return null;
  
  const backTargets: Record<string, { label: string; href: string }> = {
    issues: { label: "Back to Issues", href: "/org/issues" },
    intelligence: { label: "Back to Intelligence", href: "/org/intelligence" },
    structure: { label: "Back to Structure", href: "/org/structure" },
    people: { label: "Back to People", href: "/org/people" },
    ownership: { label: "Back to Ownership", href: "/org/ownership" },
  };
  
  return backTargets[from] || null;
}

export default async function DepartmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ departmentId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { departmentId } = await params;
  const department = await getDepartmentById(departmentId);
  if (!department) return notFound();

  const resolvedSearchParams = await searchParams;
  const fromParam = resolvedSearchParams.from || null;

  const people = await getPeopleForOrgPicker();
  const departmentsForPicker = await getDepartmentsForPicker();

  // Resolve back action based on from param or fallback to structure
  const resolvedBackAction = fromParam ? resolveBackActionServer(fromParam) : null;
  const defaultBackAction = {
    label: "Back to Structure",
    href: "/org/structure",
  };
  const backAction = resolvedBackAction || defaultBackAction;

  return (
    <div className="w-full">
      <OrgPageHeader
        title={department.name}
        description="Manage this department's details, teams, and ownership."
        backAction={backAction}
      />
      <div className="mx-auto w-full max-w-6xl px-10 pb-10">
        <div className="space-y-6">
          <div className="flex items-start justify-end gap-4">
            <DepartmentPageClient
              department={{
                id: department.id,
                name: department.name,
                ownerId: (department as any).ownerPersonId ?? null,
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
                    {personDisplayName((department as any).ownerPerson) ?? "Unassigned"}
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

