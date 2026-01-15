// src/components/org/RoleRisksCard.tsx

"use client";

import React from "react";
import { useOrgRoleRisks } from "@/hooks/useOrgRoleRisks";
import Link from "next/link";

type RoleRiskColumnProps = {
  title: string;
  items: { id: string; title: string }[];
  emptyLabel: string;
};

function RoleRiskColumn({ title, items, emptyLabel }: RoleRiskColumnProps) {
  return (
    <div className="space-y-1">
      <h4 className="text-[11px] font-semibold text-amber-100">{title}</h4>
      {items.length === 0 ? (
        <p className="text-[11px] text-amber-200/70">{emptyLabel}</p>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 5).map((role) => (
            <li key={role.id}>
              <RoleRiskLink role={role} />
            </li>
          ))}
          {items.length > 5 && (
            <li className="text-[10px] text-amber-200/80">
              + {items.length - 5} more…
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

type RoleRiskLinkProps = {
  role: { id: string; title: string };
};

function RoleRiskLink({ role }: RoleRiskLinkProps) {
  const [href, setHref] = React.useState<string | null>(null);
  const [isResolving, setIsResolving] = React.useState(false);

  React.useEffect(() => {
    const resolvedHref = getRoleEditorHrefFromContextId(role.id);
    if (resolvedHref) {
      setHref(resolvedHref);
      return;
    }

    // If it's a role-card ID, try to resolve the position
    const parts = role.id.split(":");
    if (parts.length >= 4 && parts[2] === "role-card") {
      const roleCardId = parts[3];
      setIsResolving(true);
      fetch(`/api/org/role-cards/${roleCardId}/position`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.positionId) {
            setHref(`/org/positions/${data.positionId}`);
          }
        })
        .catch(() => {
          // Silently fail - will show title without link
        })
        .finally(() => {
          setIsResolving(false);
        });
    }
  }, [role.id]);

  if (isResolving) {
    return (
      <span className="inline-flex items-center rounded bg-black/40 px-2 py-1 text-[11px] text-amber-100">
        {role.title}...
      </span>
    );
  }

  if (!href) {
    // Fallback: just show the title if we cannot parse an editor URL
    return (
      <span className="inline-flex items-center rounded bg-black/40 px-2 py-1 text-[11px] text-amber-100">
        {role.title}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center justify-between rounded bg-black/40 px-2 py-1 text-[11px] text-amber-100 hover:bg-black/60 transition-colors"
    >
      <span className="truncate">{role.title}</span>
      <span className="ml-2 text-[9px] text-amber-300">Fix →</span>
    </Link>
  );
}

/**
 * Parse a role ContextObject ID and return the editor URL.
 * Supports formats:
 * - role:<workspaceId>:position:<positionId>
 * - role:<workspaceId>:role-card:<roleCardId>
 * 
 * For role-card IDs, we try to find the associated position and navigate there,
 * since role cards are typically linked to positions.
 */
function getRoleEditorHrefFromContextId(contextId: string): string | null {
  // Example formats:
  // role:<workspaceId>:position:<positionId>
  // role:<workspaceId>:role-card:<roleCardId>
  const parts = contextId.split(":");
  if (parts.length < 4) return null;

  const [type, workspaceId, kind, entityId] = parts;
  if (type !== "role") return null;

  if (kind === "position") {
    // Navigate to OrgPosition detail page
    return `/org/positions/${entityId}`;
  }

  if (kind === "role-card") {
    // For role-card IDs, we could:
    // 1. Navigate to a role-card detail page (if it exists)
    // 2. Find the associated position and navigate there
    // 3. Navigate to a generic role editor
    
    // For now, since role cards are typically linked to positions,
    // we'll try to find the position. But if we can't, we'll just
    // show the role title without a link (handled in RoleRiskLink)
    
    // Option: Navigate to positions list with a filter/search
    // Or: Navigate to a future role-card detail page
    // For now, return null to show title without link
    // This can be enhanced later when role-card detail pages exist
    return null;
  }

  return null;
}

export function RoleRisksCard() {
  const { data, isLoading, error } = useOrgRoleRisks();
  const roleRisks = data?.roleRisks;

  if (isLoading) {
    return (
      <section className="mt-4 rounded-md border border-amber-800/50 bg-amber-950/20 p-3">
        <p className="text-[11px] text-amber-200/70">Loading role risks…</p>
      </section>
    );
  }

  if (error || !data?.ok || !roleRisks) {
    return (
      <section className="mt-4 rounded-md border border-red-800/50 bg-red-950/20 p-3">
        <p className="text-[11px] text-red-300">
          Failed to load role risks.
        </p>
      </section>
    );
  }

  // Check if there are any risks at all
  const totalRisks =
    roleRisks.withoutOwner.length +
    roleRisks.withoutResponsibilities.length +
    roleRisks.withoutTeam.length +
    roleRisks.withoutDepartment.length;

  if (totalRisks === 0) {
    return (
      <section className="mt-4 rounded-md border border-emerald-800/50 bg-emerald-950/20 p-3">
        <header className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
              Role Risks
            </h3>
            <p className="text-[11px] text-emerald-200/80">
              All roles are properly configured.
            </p>
          </div>
        </header>
        <p className="text-[11px] text-emerald-200/70">
          No role risks detected. All roles have owners, responsibilities, teams, and departments.
        </p>
      </section>
    );
  }

  return (
    <section id="role-risks" className="mt-4 rounded-md border border-amber-800/50 bg-amber-950/20 p-3">
      <header className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-200">
            Role Risks
          </h3>
          <p className="text-[11px] text-amber-200/80">
            Roles with ownership, responsibility, or placement gaps.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <RoleRiskColumn
          title="No owner"
          items={roleRisks.withoutOwner}
          emptyLabel="All roles have owners."
        />
        <RoleRiskColumn
          title="No responsibilities"
          items={roleRisks.withoutResponsibilities}
          emptyLabel="All roles have responsibilities defined."
        />
        <RoleRiskColumn
          title="No team"
          items={roleRisks.withoutTeam}
          emptyLabel="All roles are linked to teams."
        />
        <RoleRiskColumn
          title="No department"
          items={roleRisks.withoutDepartment}
          emptyLabel="All roles are linked to departments."
        />
      </div>
    </section>
  );
}

