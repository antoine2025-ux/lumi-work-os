"use client";

import { ORG_CAPABILITIES, canRole, type OrgPermissionLevel } from "@/lib/orgPermissions";

const ROLES: OrgPermissionLevel[] = ["OWNER", "ADMIN", "MEMBER"];

export function PermissionsOverview() {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-background p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-medium text-foreground">Permissions overview</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          This table summarizes what each org role can do inside the Org Center. In a later
          version, these defaults can be made configurable.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-background">
        <table className="min-w-full text-xs text-muted-foreground">
          <thead className="bg-background text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
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
                className={index !== ORG_CAPABILITIES.length - 1 ? "border-t border-border" : ""}
              >
                <td className="px-3 py-2 align-top text-foreground">
                  {capability.label}
                </td>
                <td className="px-3 py-2 align-top text-muted-foreground">
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
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted/60 text-[10px] text-muted-foreground">
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

      <p className="text-[11px] text-muted-foreground">
        Permissions are read-only for now. To tighten access, we&apos;ll connect this matrix to
        auth checks in Org APIs and UI entry points in a later milestone.
      </p>
    </section>
  );
}

