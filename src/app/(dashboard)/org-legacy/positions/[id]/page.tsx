import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrgPositionById } from "@/lib/org/positions";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { AskLoopbrainButton } from "@/components/org/AskLoopbrainButton";
import { RoleLoopbrainPanelClient } from "@/components/org/RoleLoopbrainPanelClient";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrgPositionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const pos = await getOrgPositionById(id);

  if (!pos) {
    return notFound();
  }

  const {
    id: positionId,
    title,
    level,
    isActive,
    teamId,
    teamName,
    departmentId,
    departmentName,
    userId,
    userName,
    updatedAt,
    roleDescription,
    responsibilities,
    requiredSkills,
    preferredSkills,
  } = pos;

  const rightSlot = (
    <div className="flex flex-col items-end gap-2 text-right">
      {level != null && (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
          Level L{level}
        </span>
      )}
      {!isActive && (
        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          Inactive
        </span>
      )}
      <span className="text-[10px] text-muted-foreground">
        Updated {new Date(updatedAt).toLocaleDateString()}
      </span>
      <AskLoopbrainButton
        positionId={positionId}
        initialQuestion="What are the key responsibilities and expectations for this role?"
      />
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      <OrgPageHeader
        title={title}
        description="Position details, team, and responsibilities."
        breadcrumb="ORG / POSITIONS / {title}"
        actions={rightSlot}
      />

      {/* Assignment + hierarchy */}
      <section className="space-y-3 rounded-md border bg-card p-4 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Assignment
        </h2>
        <dl className="grid gap-4 text-xs md:grid-cols-3">
          <div>
            <dt className="text-[11px] text-muted-foreground">Person</dt>
            <dd className="mt-1">
              {userId ? (
                <span className="font-medium">{userName ?? "Assigned user"}</span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  Vacant
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Team</dt>
            <dd className="mt-1">
              {teamId ? (
                <Link
                  href={`/org/teams/${encodeURIComponent(teamId)}`}
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  {teamName ?? "View team"}
                </Link>
              ) : (
                <span className="text-[11px] text-muted-foreground">Unassigned</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Department</dt>
            <dd className="mt-1">
              {departmentId ? (
                <Link
                  href={`/org/departments/${encodeURIComponent(departmentId)}`}
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  {departmentName ?? "View department"}
                </Link>
              ) : (
                <span className="text-[11px] text-muted-foreground">—</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {/* Role description */}
      <section className="space-y-3 rounded-md border bg-card p-4 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Role summary
        </h2>
        <p className="text-sm whitespace-pre-line">
          {roleDescription || "No role description has been added for this position yet."}
        </p>
      </section>

      {/* Responsibilities + skills (basic read-only) */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 rounded-md border bg-card p-4 text-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Responsibilities
          </h3>
          {responsibilities.length === 0 ? (
            <p className="text-xs text-muted-foreground">No responsibilities defined.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-4 text-xs">
              {responsibilities.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2 rounded-md border bg-card p-4 text-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Required skills
          </h3>
          {requiredSkills.length === 0 ? (
            <p className="text-xs text-muted-foreground">No required skills defined.</p>
          ) : (
            <ul className="flex flex-wrap gap-1">
              {requiredSkills.map((skill, idx) => (
                <li
                  key={idx}
                  className="rounded-full bg-muted px-2 py-0.5 text-[11px]"
                >
                  {skill}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2 rounded-md border bg-card p-4 text-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Preferred skills
          </h3>
          {preferredSkills.length === 0 ? (
            <p className="text-xs text-muted-foreground">No preferred skills listed.</p>
          ) : (
            <ul className="flex flex-wrap gap-1">
              {preferredSkills.map((skill, idx) => (
                <li
                  key={idx}
                  className="rounded-full bg-muted px-2 py-0.5 text-[11px]"
                >
                  {skill}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Role Loopbrain Panel */}
      <RoleLoopbrainPanelClient positionId={positionId} roleName={title} />

      <footer className="pt-2 flex items-center justify-between text-xs">
        <Link
          href="/org/positions"
          className="text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Back to Positions
        </Link>
        <Link
          href="/org"
          className="text-muted-foreground underline-offset-2 hover:underline"
        >
          Back to Org overview
        </Link>
      </footer>
    </div>
  );
}

