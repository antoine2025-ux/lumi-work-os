// src/components/org/PersonRolesCard.tsx

"use client";

import { usePersonRoles } from "@/hooks/usePersonRoles";
import { useOpenLoopbrainForPerson } from "@/lib/loopbrain/client-helpers";

interface PersonRolesCardProps {
  personContextId: string; // e.g. "person:userId"
}

export function PersonRolesCard({ personContextId }: PersonRolesCardProps) {
  const { data: rolesData, isLoading: rolesLoading } = usePersonRoles(personContextId);
  const openLoopbrainForPerson = useOpenLoopbrainForPerson();

  const roles = rolesData?.roles ?? [];

  return (
    <section className="rounded-lg border border-gray-800 bg-gray-900/40 p-3 space-y-2">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-300">
            Roles this person holds
          </h3>
          <p className="text-[11px] text-gray-500">
            Based on Org roles & responsibilities graph.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            openLoopbrainForPerson({
              personId: personContextId,
              initialQuestion:
                "Is this person overloaded based on their roles, responsibilities, and active projects?",
            })
          }
          className="rounded border border-emerald-600 bg-emerald-900/20 px-2 py-1 text-[10px] font-medium text-emerald-200 hover:bg-emerald-900/40"
        >
          Ask Loopbrain
        </button>
      </header>

      {rolesLoading ? (
        <p className="text-[11px] text-gray-500">Loading roles…</p>
      ) : roles.length === 0 ? (
        <p className="text-[11px] text-gray-500">
          No roles found for this person in Org data.
        </p>
      ) : (
        <ul className="space-y-1">
          {roles.map((role) => (
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

