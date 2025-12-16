import Link from "next/link";

type OrgTeamDTO = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  order: number;
  isActive: boolean;
  departmentId: string | null;
  departmentName: string | null;
  positionsCount: number;
  filledPositionsCount: number;
  updatedAt: string;
};

async function fetchTeams(departmentId?: string): Promise<OrgTeamDTO[]> {
  const search = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : "";
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/org/teams${search}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Failed to fetch org teams", res.status);
    return [];
  }

  const data = await res.json();
  if (!data.ok || !Array.isArray(data.teams)) {
    console.error("Invalid org teams response", data);
    return [];
  }

  return data.teams as OrgTeamDTO[];
}

type OrgTeamsPageProps = {
  searchParams?: {
    departmentId?: string;
  };
};

export default async function OrgTeamsPage({ searchParams }: OrgTeamsPageProps) {
  const departmentId = searchParams?.departmentId || undefined;
  const teams = await fetchTeams(departmentId);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Org • Structure
        </p>
        <h1 className="text-3xl font-bold">Teams</h1>
        <p className="text-sm text-muted-foreground">
          View active teams in this workspace. Use the Org Overview to navigate by department.
        </p>
      </header>

      {/* Filter hint */}
      {departmentId && (
        <p className="text-xs text-muted-foreground">
          Showing teams in department <span className="font-semibold">{departmentId}</span>.
        </p>
      )}

      {/* Empty state */}
      {teams.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No teams found for this selection yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/org/teams/${encodeURIComponent(team.id)}`}
              className="group rounded-md border bg-card p-4 shadow-sm transition hover:border-primary/50"
            >
              <header className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold leading-tight">{team.name}</h2>
                  {team.departmentName && (
                    <p className="text-xs text-muted-foreground">
                      {team.departmentName}
                    </p>
                  )}
                </div>
                {team.color && (
                  <span
                    className="inline-block h-3 w-3 rounded-full border"
                    style={{ backgroundColor: team.color }}
                  />
                )}
              </header>

              {team.description && (
                <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
                  {team.description}
                </p>
              )}

              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Positions</dt>
                  <dd className="font-medium">{team.positionsCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Filled</dt>
                  <dd className="font-medium">{team.filledPositionsCount}</dd>
                </div>
              </dl>

              <p className="mt-3 text-[10px] text-primary group-hover:underline">
                Open team →
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
