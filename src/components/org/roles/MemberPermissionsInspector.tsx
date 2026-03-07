"use client";

import { useMemo } from "react";
import type { OrgCapability, OrgRole } from "@/lib/org/capabilities";
import {
  ORG_CAPABILITY_DESCRIPTIONS,
  ORG_CAPABILITY_GROUPS,
  listCombinedCapabilities,
} from "@/lib/org/capabilities";
import { RolePillGroup } from "./RolePillGroup";

type MemberPermissionsInspectorProps = {
  open: boolean;
  onClose: () => void;
  member: {
    id: string;
    name: string | null;
    email: string | null;
    role: OrgRole;
    customRoleName?: string | null;
    customRoleCapabilities?: OrgCapability[];
  } | null;
};

export function MemberPermissionsInspector({
  open,
  onClose,
  member,
}: MemberPermissionsInspectorProps) {
  const combinedCapabilities = useMemo(
    () =>
      member
        ? listCombinedCapabilities(member.role, {
            capabilities: member.customRoleCapabilities ?? [],
          })
        : [],
    [member]
  );

  const combinedSet = new Set<OrgCapability>(combinedCapabilities);

  if (!open || !member) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/40 transition-opacity duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Member permissions inspector"
    >
      <div
        className={`flex h-full w-full max-w-md flex-col border-l border-border bg-background px-5 py-5 text-[13px] text-foreground shadow-xl transition-all duration-150 ${
          open ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-[14px] font-semibold text-foreground">
              What can this person do?
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              See which actions this member can perform in the organization, based on their base role and any custom role.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Close permissions inspector"
          >
            Close
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-border bg-background/60 px-4 py-3">
          <div className="mb-1 text-[13px] font-medium text-foreground">
            {member.name || member.email || "Unknown member"}
          </div>
          {member.email && member.name && (
            <div className="text-[11px] text-muted-foreground">{member.email}</div>
          )}
          <div className="mt-2">
            <RolePillGroup
              baseRole={member.role}
              customRoleName={member.customRoleName}
            />
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-auto pr-1">
          {ORG_CAPABILITY_GROUPS.map((group) => {
            const presentCaps = group.capabilities.filter((cap) =>
              combinedSet.has(cap)
            );

            if (presentCaps.length === 0) {
              return (
                <div
                  key={group.id}
                  className="rounded-xl border border-slate-900 bg-background/40 px-4 py-3"
                >
                  <div className="text-[12px] font-medium text-muted-foreground">
                    {group.label}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600">
                    This member has no special permissions in this area.
                  </p>
                </div>
              );
            }

            return (
              <div
                key={group.id}
                className="rounded-xl border border-border bg-background/60 px-4 py-3"
              >
                <div className="mb-2 text-[12px] font-medium text-foreground">
                  {group.label}
                </div>
                <ul className="space-y-1.5">
                  {presentCaps.map((cap) => (
                    <li key={cap} className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">{cap}</span>
                      <span className="text-muted-foreground">
                        {" — "}
                        {ORG_CAPABILITY_DESCRIPTIONS[cap] ??
                          "No description available yet."}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

