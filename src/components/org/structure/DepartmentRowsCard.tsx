import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function displayName(p: any) {
  if (!p) return "Unassigned";
  return p.fullName || [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email || "Unassigned";
}

function TeamMiniList(props: { teams: any[] }) {
  const teams = props.teams ?? [];
  if (!teams.length) {
    return <div className="text-sm text-muted-foreground">No teams yet.</div>;
  }

  // Show up to 3 teams, then "+N more"
  const preview = teams.slice(0, 3);
  const remaining = teams.length - preview.length;

  return (
    <div className="flex flex-col gap-1">
      {preview.map((t) => (
        <div key={t.id} className="flex items-center justify-between gap-3">
          <div className="truncate text-sm">{t.name}</div>
          <div className="shrink-0 text-xs text-muted-foreground">
            Owner: {displayName(t.owner)}
          </div>
        </div>
      ))}
      {remaining > 0 && (
        <div className="text-xs text-muted-foreground">+{remaining} more</div>
      )}
    </div>
  );
}

export function DepartmentRowsCard(props: {
  departments: Array<{
    id: string;
    name: string;
    ownerPerson?: any | null;
    teams?: any[];
  }>;
}) {
  const departments = props.departments ?? [];

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 md:px-6 md:py-4">
        <div className="text-base font-semibold">Departments</div>
        <div className="text-sm text-muted-foreground">
          Design how departments and teams are organized across your company.
        </div>
      </div>

      <div className="border-t">
        {departments.map((d, idx) => {
          const teams = d.teams ?? [];
          const isEmpty = teams.length === 0;
          const isUnassigned = d.name?.toLowerCase() === "unassigned";
          const missingOwner = !d.ownerPerson;

          return (
            <Link
              key={d.id}
              href={`/org/structure/departments/${d.id}`}
              className={cn(
                "group block px-4 py-4 md:px-6",
                idx !== 0 && "border-t",
                "hover:bg-muted/30 transition-colors"
              )}
            >
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-base font-medium">{d.name}</div>

                    {missingOwner && (
                      <Badge variant="outline" className="rounded-full text-[11px]">
                        Missing owner
                      </Badge>
                    )}
                    {isEmpty && (
                      <Badge variant="secondary" className="rounded-full text-[11px]">
                        Empty
                      </Badge>
                    )}
                    {isUnassigned && (
                      <Badge variant="secondary" className="rounded-full text-[11px]">
                        Unassigned
                      </Badge>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <div>{teams.length} {teams.length === 1 ? "team" : "teams"}</div>
                    <div>Owner: {displayName(d.ownerPerson)}</div>
                  </div>

                  <div className="mt-3">
                    <TeamMiniList teams={teams} />
                  </div>
                </div>

                <div className="shrink-0 pt-1 text-sm text-muted-foreground group-hover:text-foreground">
                  Manage →
                </div>
              </div>
            </Link>
          );
        })}

        {!departments.length && (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No departments yet.
          </div>
        )}
      </div>
    </Card>
  );
}

