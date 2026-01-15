"use client";

import React from "react";
import { ORG_CAPABILITY_DESCRIPTIONS } from "@/lib/org/capabilities";
import type { OrgRole, OrgCapability } from "@/lib/org/capabilities";

type RoleMatrix = {
  [role in OrgRole]: Record<OrgCapability, boolean>;
};

type Props = {
  matrix: RoleMatrix;
};

export function OrgPermissionsMatrix({ matrix }: Props) {
  const roles: OrgRole[] = ["OWNER", "ADMIN", "MEMBER"];
  const capabilities = Object.keys(ORG_CAPABILITY_DESCRIPTIONS) as OrgCapability[];

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#020617] p-6 text-[13px]">
      <div className="mb-4">
        <h2 className="text-[14px] font-semibold text-slate-100">
          Role permissions
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">
          See what each role can do across the organization.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-[200px_repeat(3,1fr)] gap-y-2 text-[12px] min-w-[600px]">
          <div className="font-medium text-slate-400 py-2">Capability</div>
          {roles.map((r) => (
            <div key={r} className="text-center font-medium text-slate-400 capitalize py-2">
              {r === "OWNER" ? "Owner" : r === "ADMIN" ? "Admin" : "Member"}
            </div>
          ))}

          {capabilities.map((cap) => (
            <React.Fragment key={cap}>
              <div className="py-2 pr-4">
                <div className="font-medium text-slate-200">{cap}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {ORG_CAPABILITY_DESCRIPTIONS[cap]}
                </div>
              </div>

              {roles.map((r) => (
                <div
                  key={`${cap}-${r}`}
                  className="flex items-center justify-center py-2"
                >
                  {matrix[r][cap] ? (
                    <span className="h-2 w-2 rounded-full bg-blue-400" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-slate-700" />
                  )}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

