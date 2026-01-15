"use client";

import { useEffect, useState } from "react";
import { useOrgPermissions } from "@/components/org/OrgPermissionsContext";

export function OrgPermissionsDiagnostic() {
  const perms = useOrgPermissions();
  const [serverContext, setServerContext] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/org/debug/full");
        const json = await res.json();
        setServerContext(json);
      } catch (err) {
        setServerContext({ error: "Failed to load debug data." });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="mt-4 rounded-lg border border-slate-800 bg-[#020617] p-4 text-[12px] text-slate-300">
        <div className="text-slate-100 mb-2 font-semibold">Org Permissions Diagnostic</div>
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-800 bg-[#020617] p-4 text-[12px] text-slate-300">
      <div className="text-slate-100 mb-2 font-semibold">Org Permissions Diagnostic</div>

      <div className="mb-3">
        <div className="text-slate-400 mb-1">Client role:</div>
        <pre className="text-[11px] overflow-auto max-h-32 rounded bg-slate-900/50 p-2">
          {JSON.stringify(perms, null, 2)}
        </pre>
      </div>

      <div>
        <div className="text-slate-400 mb-1">Server context & full role capabilities:</div>
        <pre className="text-[11px] overflow-auto max-h-96 rounded bg-slate-900/50 p-2">
          {JSON.stringify(serverContext, null, 2)}
        </pre>
      </div>
    </div>
  );
}

