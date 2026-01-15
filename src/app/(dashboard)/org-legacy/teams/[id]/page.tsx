"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { TeamRolesCard } from "@/components/org/TeamRolesCard";
import { TeamLoopbrainPanel } from "@/components/org/TeamLoopbrainPanel";

type OrgTeamPosition = {
  id: string;
  title: string;
  level: number | null;
  isActive: boolean;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
};

type OrgTeamDetail = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  updatedAt: string;
  department: {
    id: string;
    name: string;
  } | null;
  positions: OrgTeamPosition[];
};

export default function OrgTeamDetailPage() {
  const params = useParams();
  const teamId = params?.id as string;

  const [team, setTeam] = useState<OrgTeamDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;

    async function loadTeam() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`/api/org/teams/${teamId}`);
        if (!res.ok) {
          if (!cancelled) {
            setError("Failed to load team");
          }
          return;
        }

        const json = await res.json();
        if (!json.ok || !json.team) {
          if (!cancelled) {
            setError("Team not found");
          }
          return;
        }

        if (!cancelled) {
          setTeam(json.team);
        }
      } catch (err) {
        console.error("Error fetching org team:", err);
        if (!cancelled) {
          setError("Unexpected error while loading team");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadTeam();

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (error || !team) {
    return notFound();
  }

  const {
    id,
    name,
    description,
    department,
    isActive,
    updatedAt,
    positions,
  } = team;

  const departmentId = department?.id ?? null;
  const departmentName = department?.name ?? null;

  // Convert positions to members format for display
  const members = positions.map((pos) => ({
    positionId: pos.id,
    fullName: pos.userName ?? pos.userEmail ?? null,
    roleTitle: pos.title,
    level: pos.level,
    isVacant: pos.userId === null,
  }));

  const rightSlot = (
    <div className="flex flex-col items-end gap-2 text-right">
      {departmentId && (
        <Link
          href={`/org/departments/${encodeURIComponent(departmentId)}`}
          className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
        >
          {departmentName || "View department"} →
        </Link>
      )}
      {!isActive && (
        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          Inactive
        </span>
      )}
      <span className="mt-1 text-[10px] text-muted-foreground">
        Updated {new Date(updatedAt).toLocaleDateString()}
      </span>
      {/* Placeholder for Loopbrain CTA */}
      <span className="text-[10px] text-muted-foreground">
        Loopbrain actions coming soon
      </span>
    </div>
  );

  const deptCrumb =
    departmentId && departmentName
      ? { label: departmentName, href: `/org/departments/${departmentId}` }
      : { label: "Teams", href: "/org/teams" };

  return (
    <div className="p-8 space-y-6">
      <OrgPageHeader
        title={name}
        description="Team details, members, and relationships."
        breadcrumb="ORG / TEAMS / {name}"
        actions={rightSlot}
      />

      {/* Overview */}
      <section className="space-y-3 rounded-md border bg-card p-4 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Overview
        </h2>
        <p className="text-sm">
          {description || "No description has been added for this team yet."}
        </p>
      </section>

      {/* Members */}
      <section className="space-y-3 rounded-md border bg-card p-4 text-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Members
            </h2>
            <p className="text-xs text-muted-foreground">
              Based on positions assigned to this team.
            </p>
          </div>
        </div>

        {members.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No positions have been assigned to this team yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b text-[11px] text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Person</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Level</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.positionId} className="border-b last:border-0">
                    <td className="py-2 pr-4 align-top">
                      {m.fullName ? (
                        <span className="font-medium">{m.fullName}</span>
                      ) : (
                        <span className="font-medium text-muted-foreground">
                          Vacant
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 align-top">
                      {m.roleTitle || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 align-top">
                      {m.level != null ? (
                        <span>L{m.level}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 align-top">
                      {m.isVacant ? (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          Vacant position
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          Filled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Team Roles Card */}
      <TeamRolesCard teamContextId={`team:${id}`} />

      {/* Team Loopbrain Panel */}
      <TeamLoopbrainPanel teamId={id} teamName={name} />

      {/* Footer navigation */}
      <footer className="pt-2 flex items-center justify-between text-xs">
        <Link
          href="/org/teams"
          className="text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Back to Teams list
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
