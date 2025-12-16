"use client";

import { useState } from "react";
import type { OrgCapability, OrgRole } from "@/lib/org/capabilities";
import { RolePillGroup } from "@/components/org/roles/RolePillGroup";
import { MemberPermissionsInspector } from "@/components/org/roles/MemberPermissionsInspector";
import { CustomRoleSelector } from "./CustomRoleSelector";

type Member = {
  id: string;
  userId: string;
  role: string;
  customRoleId?: string | null;
  customRole?: {
    id: string;
    name: string;
    capabilities: any;
  } | null;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

type Props = {
  members: Member[];
  customRoles: Array<{ id: string; name: string }>;
  currentUserId: string;
};

export function MembersListClient({ members, customRoles, currentUserId }: Props) {
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorMember, setInspectorMember] = useState<{
    id: string;
    name: string | null;
    email: string | null;
    role: OrgRole;
    customRoleName?: string | null;
    customRoleCapabilities?: OrgCapability[];
  } | null>(null);

  function openInspectorForMember(member: Member) {
    setInspectorMember({
      id: member.id,
      name: member.user?.name ?? null,
      email: member.user?.email ?? null,
      role: (member.role || "MEMBER") as OrgRole,
      customRoleName: member.customRole?.name ?? null,
      customRoleCapabilities: (member.customRole?.capabilities ?? []) as OrgCapability[],
    });
    setInspectorOpen(true);
  }

  return (
    <>
      <ul className="space-y-2">
        {members.map((member) => {
          const isSelf = member.userId === currentUserId;
          const label =
            member.user?.name ||
            member.user?.email ||
            "This member";

          return (
            <li
              key={member.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {member.user?.name || member.user?.email || "Unknown member"}
                  {isSelf && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (you)
                    </span>
                  )}
                </span>
                {member.user?.email && (
                  <span className="text-xs text-muted-foreground">
                    {member.user.email}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <RolePillGroup
                  baseRole={member.role}
                  customRoleName={member.customRole?.name ?? null}
                />
                <button
                  type="button"
                  onClick={() => openInspectorForMember(member)}
                  className="focus-ring rounded-full border border-slate-800 px-2 py-1 text-[10px] text-slate-300 transition-colors hover:bg-slate-800"
                  aria-label={`View permissions for ${member.user?.name || member.user?.email || "this member"}`}
                >
                  View permissions
                </button>
                {customRoles.length > 0 && (
                  <CustomRoleSelector
                    memberId={member.id}
                    currentCustomRoleId={member.customRoleId || null}
                    customRoleOptions={customRoles}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <MemberPermissionsInspector
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        member={inspectorMember}
      />
    </>
  );
}

