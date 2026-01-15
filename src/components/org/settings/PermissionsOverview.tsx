"use client";

import { ORG_CAPABILITIES, canRole, type OrgPermissionLevel } from "@/lib/orgPermissions";

const ROLES: OrgPermissionLevel[] = ["OWNER", "ADMIN", "MEMBER"];

export function PermissionsOverview() {
  return (
    <section className="space-y-4 rounded-2xl border border-[#111827] bg-[#020617] p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-medium text-slate-100">Permissions overview</h2>
        <p className="mt-1 text-xs text-slate-400">
          This table summarizes what each org role can do inside the Org Center. In a later
          version, these defaults can be made configurable.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#111827] bg-[#020617]">
        <table className="min-w-full text-xs text-slate-300">
          <thead className="bg-[#020617] text-[11px] uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Capability</th>
              <th className="px-3 py-2 text-left font-medium w-[40%]">What it means</th>
              {ROLES.map((role) => (
                <th key={role} className="px-3 py-2 text-center font-medium">
                  {role === "OWNER" ? "Owner" : role === "ADMIN" ? "Admin" : "Member"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ORG_CAPABILITIES.map((capability, index) => (
              <tr
                key={capability.key}
                className={index !== ORG_CAPABILITIES.length - 1 ? "border-t border-[#111827]" : ""}
              >
                <td className="px-3 py-2 align-top text-slate-100">
                  {capability.label}
                </td>
                <td className="px-3 py-2 align-top text-slate-400">
                  {capability.description}
                </td>
                {ROLES.map((role) => {
                  const allowed = canRole(role, capability.key);

                  return (
                    <td
                      key={role}
                      className="px-3 py-2 text-center align-top text-[11px]"
                    >
                      {allowed ? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] text-emerald-300">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-800/60 text-[10px] text-slate-500">
                          –
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-500">
        Permissions are read-only for now. To tighten access, we&apos;ll connect this matrix to
        auth checks in Org APIs and UI entry points in a later milestone.
      </p>
    </section>
  );
}

