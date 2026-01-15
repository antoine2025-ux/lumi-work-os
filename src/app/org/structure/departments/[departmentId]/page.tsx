/**
 * Department Detail Page - Server Component
 * 
 * Shows department details, teams, and ownership information.
 * Edit-ready layout with drawer for editing.
 */

export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { getDepartmentById, getPeopleForOrgPicker, getDepartmentsForPicker } from "@/lib/org/queries";
import { Card } from "@/components/ui/card";
import { DepartmentPageClient } from "./DepartmentPageClient";
import { TeamsSectionClient } from "./TeamsSectionClient";
import { personDisplayName } from "@/lib/org/displayName";
import { Button } from "@/components/ui/button";

export default async function DepartmentPage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  const { departmentId } = await params;
  const department = await getDepartmentById(departmentId);
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
                href="/org/structure"
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

