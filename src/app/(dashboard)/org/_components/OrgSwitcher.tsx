"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useOrgContext } from "./OrgContext";

type Org = { id: string; name: string; role: string };

export function OrgSwitcher() {
  const { data: session, update } = useSession();
  const { activeOrgId, activeOrgName } = useOrgContext();

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/org/list");
      const data = await res.json().catch(() => ({} as any));
      if (data?.ok) setOrgs(data.orgs);
      setLoading(false);
    })();
  }, []);

  async function switchOrg(orgId: string) {
    // validate membership
    const res = await fetch("/api/org/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    const data = await res.json().catch(() => ({} as any));
    if (!data?.ok) return;

    await update({ activeOrgId: orgId } as any);
    window.location.reload();
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white/70 p-3 text-sm text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
        Loading orgs…
      </div>
    );
  }

  if (orgs.length === 0) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white/70 p-3 text-sm text-black/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
        No organizations found.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="text-xs font-medium text-black/60 dark:text-white/60">
        Organization
      </div>
      {activeOrgName ? (
        <div className="mt-1 text-xs text-black/50 dark:text-white/50">
          Current: {activeOrgName}
        </div>
      ) : null}
      <select
        value={activeOrgId || orgs[0]?.id || ""}
        onChange={(e) => switchOrg(e.target.value)}
        className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black"
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} ({o.role})
          </option>
        ))}
      </select>
    </div>
  );
}
