"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type OrgCtx = {
  orgId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const CurrentOrgContext = createContext<OrgCtx | null>(null);

export function CurrentOrgProvider(props: { initialOrgId: string | null; children: React.ReactNode }) {
  const [orgId, setOrgId] = useState<string | null>(props.initialOrgId);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/org/current");
      const json = await res.json().catch(() => null);
      setOrgId(json?.data?.org?.id ?? null);
    } finally {
      setLoading(false);
    }
  }

  // If we didn't have initial orgId, fetch it once.
  useEffect(() => {
    if (orgId === null) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({ orgId, loading, refresh }), [orgId, loading]);

  return <CurrentOrgContext.Provider value={value}>{props.children}</CurrentOrgContext.Provider>;
}

export function useCurrentOrg() {
  const ctx = useContext(CurrentOrgContext);
  if (!ctx) throw new Error("useCurrentOrg must be used within CurrentOrgProvider");
  return ctx;
}

