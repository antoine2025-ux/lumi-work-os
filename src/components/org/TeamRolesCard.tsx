// src/components/org/TeamRolesCard.tsx

"use client";

import { useTeamRoles } from "@/hooks/useTeamRoles";
import { useOpenLoopbrainForTeam } from "@/lib/loopbrain/client-helpers";

interface TeamRolesCardProps {
  teamContextId: string; // e.g. "team:teamId"
}

export function TeamRolesCard({ teamContextId }: TeamRolesCardProps) {
  const { data: teamRolesData, isLoading: teamRolesLoading } = useTeamRoles(
    teamContextId
  );
  const openLoopbrainForTeam = useOpenLoopbrainForTeam();

  const teamRoles = teamRolesData?.roles ?? [];

  return (
    <section className="rounded-lg border border-gray-800 bg-gray-900/40 p-3 space-y-2">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-300">
            Key roles in this team
          </h3>
          <p className="text-[11px] text-gray-500">
            Derived from Org roles & responsibilities graph.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            openLoopbrainForTeam({
              teamId: teamContextId,
              initialQuestion:
                "What are the most critical unfilled or under-defined roles in this team?",
            })
          }
          className="rounded border border-sky-600 bg-sky-900/20 px-2 py-1 text-[10px] font-medium text-sky-200 hover:bg-sky-900/40"
        >
          Ask Loopbrain
        </button>
      </header>

      {teamRolesLoading ? (
        <p className="text-[11px] text-gray-500">Loading team roles…</p>
      ) : teamRoles.length === 0 ? (
        <p className="text-[11px] text-gray-500">
          No roles found for this team in Org data.
        </p>
      ) : (
        <ul className="space-y-1">
          {teamRoles.map((role) => (
            <li key={role.id} className="rounded bg-black/30 px-2 py-1">
              <div className="text-xs font-semibold text-gray-100">
                {role.title}
              </div>
              {role.summary && (
                <div className="text-[11px] text-gray-400 line-clamp-2">
                  {role.summary}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

