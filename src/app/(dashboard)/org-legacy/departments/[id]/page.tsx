import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrgDepartmentById } from "@/lib/org/departments";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { DepartmentLoopbrainPanelClient } from "@/components/org/DepartmentLoopbrainPanelClient";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrgDepartmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const department = await getOrgDepartmentById(id);

  if (!department) {
    return notFound();
  }

  const { id: departmentId, name, description, teamCount, isActive } = department;

  const rightSlot = (
    <div className="flex flex-col items-end gap-2 text-right">
      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
        {teamCount} {teamCount === 1 ? "team" : "teams"}
      </span>
      {!isActive && (
        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          Inactive
        </span>
      )}
      {/* Placeholder for future Loopbrain CTA */}
      <span className="mt-1 text-[10px] text-muted-foreground">
        Loopbrain actions coming soon
      </span>
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      <OrgPageHeader
        title={name}
        description="Department details and teams overview."
        breadcrumb="ORG / DEPARTMENTS / {name}"
        actions={rightSlot}
      />

      <section className="space-y-3 rounded-md border bg-card p-4 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Overview
        </h2>
        <p className="text-sm">
          {description || "No description has been added for this department yet."}
        </p>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-4 text-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Teams
            </h2>
            <p className="text-xs text-muted-foreground">
              View teams that belong to this department.
            </p>
          </div>
          <Link
            href={`/org/teams?departmentId=${encodeURIComponent(departmentId)}`}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            View teams in this department →
          </Link>
        </div>
      </section>

      {/* Department Loopbrain Panel */}
      <DepartmentLoopbrainPanelClient departmentId={departmentId} departmentName={name} />

      <footer className="pt-2">
        <Link
          href="/org"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Back to Org overview
        </Link>
      </footer>
    </div>
  );
}
