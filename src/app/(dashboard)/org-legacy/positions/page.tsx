import Link from "next/link";
import { getOrgPositionsList } from "@/lib/org/positions";

// Force dynamic rendering - this page requires authentication
export const dynamic = "force-dynamic";

export default async function OrgPositionsPage() {
  const positions = await getOrgPositionsList();

  return (
    <div className="p-8 space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Org &gt; Positions
        </p>
        <h1 className="text-2xl font-semibold leading-tight">Positions</h1>
        <p className="text-xs text-muted-foreground">
          See all positions across your organization, including vacant roles and filled seats.
        </p>
      </header>

      {positions.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No positions found yet. Start by defining departments, teams, and positions in your Org
          settings.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b text-[11px] text-muted-foreground">
                <th className="py-2 pl-4 pr-4 font-medium">Position</th>
                <th className="py-2 pr-4 font-medium">Team</th>
                <th className="py-2 pr-4 font-medium">Department</th>
                <th className="py-2 pr-4 font-medium">Person</th>
                <th className="py-2 pr-4 font-medium">Level</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => (
                <tr key={pos.id} className="border-b last:border-0">
                  <td className="py-2 pl-4 pr-4 align-top">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">{pos.title}</span>
                      <span className="text-[10px] text-muted-foreground">
                        Updated {new Date(pos.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pr-4 align-top">
                    {pos.teamId ? (
                      <Link
                        href={`/org/teams/${encodeURIComponent(pos.teamId)}`}
                        className="text-xs text-primary underline-offset-2 hover:underline"
                      >
                        {pos.teamName ?? "View team"}
                      </Link>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Unassigned</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 align-top">
                    {pos.departmentId ? (
                      <Link
                        href={`/org/departments/${encodeURIComponent(pos.departmentId)}`}
                        className="text-xs text-primary underline-offset-2 hover:underline"
                      >
                        {pos.departmentName ?? "View department"}
                      </Link>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 align-top">
                    {pos.userId ? (
                      <span className="text-xs">{pos.userName ?? "Assigned user"}</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        Vacant
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 align-top">
                    {pos.level != null ? (
                      <span className="text-xs">L{pos.level}</span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 align-top">
                    {pos.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 align-top text-right">
                    <Link
                      href={`/org/positions/${encodeURIComponent(pos.id)}`}
                      className="text-[11px] text-primary underline-offset-2 hover:underline"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
