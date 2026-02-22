"use client";

import { useOrgAdminActivityStrip } from "@/hooks/useOrgAdminActivityStrip";
import type { OrgAdminActivityItem } from "@/types/org";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";

type AdminActivityStripProps = {
  initialItems?: OrgAdminActivityItem[];
};

// Helper to map action/targetType/meta into a human-readable line
function mapAction(raw: {
  action: string;
  targetType: string | null;
  meta: any | null;
}): { label: string } {
  const { action, meta } = raw;

  if (action === "INVITE_CREATED") {
    const email = meta?.email ?? "Unknown";
    return {
      label: `Invited ${email}`,
    };
  }

  if (action === "TEAM_CREATED") {
    const name = meta?.name ?? "New team";
    return {
      label: `Created team "${name}"`,
    };
  }

  if (action === "DEPARTMENT_CREATED") {
    const name = meta?.name ?? "New department";
    return {
      label: `Created department "${name}"`,
    };
  }

  if (action === "ROLE_CREATED") {
    const name = meta?.name ?? "New role";
    return {
      label: `Created role "${name}"`,
    };
  }

  if (action === "MEMBER_CUSTOM_ROLE_UPDATED") {
    const p = meta || {};
    const actorName = p.actorName || p.actor?.name || p.actor?.email || "Someone";
    const targetName = p.memberName || p.memberEmail || p.memberId || "a member";

    let actionText = "";

    if (!p.oldCustomRoleId && p.newCustomRoleId) {
      actionText = `assigned custom role "${p.newCustomRoleName || "Unknown"}"`;
    } else if (p.oldCustomRoleId && !p.newCustomRoleId) {
      actionText = `removed custom role "${p.oldCustomRoleName || "Unknown"}"`;
    } else {
      actionText = `changed custom role from "${p.oldCustomRoleName || "Unknown"}" to "${p.newCustomRoleName || "Unknown"}"`;
    }

    return {
      label: `${actorName} ${actionText} for ${targetName}`,
    };
  }

  // Fallback
  return {
    label: action,
  };
}

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export function AdminActivityStrip({ initialItems }: AdminActivityStripProps = {}) {
  const { items: hookItems, isLoading, error } = useOrgAdminActivityStrip();
  // Use initial items if provided (from server), otherwise use hook data
  const items = initialItems ?? hookItems;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[#111827] bg-[#020617] p-3">
        <div className="h-4 w-32 animate-pulse rounded bg-[#111827]" />
        <div className="mt-2 h-3 w-full max-w-md animate-pulse rounded bg-[#111827]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#111827] bg-[#020617] p-3 text-[11px] text-slate-400">
        Failed to load admin activity: {error}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <OrgEmptyState
        title="No activity yet"
        description="Activity will appear here once people join, roles change, or exports are created."
        className="rounded-2xl border border-[#111827] bg-[#020617]"
      />
    );
  }

  const top = items.slice(0, 6);

  return (
    <section className="space-y-2 rounded-2xl border border-[#111827] bg-[#020617] p-3 text-[11px] text-slate-300">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Admin activity
        </div>
        <div className="text-[10px] text-slate-500">
          Last {top.length} actions
        </div>
      </div>
      <ul className="space-y-1.5">
        {top.map((item) => {
          const mapped = mapAction({
            action: item.action,
            targetType: item.targetType,
            meta: item.meta,
          });

          const actorLabel =
            item.actor?.name ??
            item.actor?.email ??
            "Someone";

          return (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 text-[11px]"
            >
              <div className="flex flex-col">
                <span className="text-slate-200">
                  {mapped.label}
                </span>
                <span className="text-[10px] text-slate-500">
                  by {actorLabel}
                </span>
              </div>
              <div className="shrink-0 text-right text-[10px] text-slate-500">
                {formatTime(item.createdAt)}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

