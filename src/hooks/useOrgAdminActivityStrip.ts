"use client";

import { useEffect, useState } from "react";
import { useCurrentOrg } from "./useCurrentOrg";
import type { OrgAdminActivityItem } from "@/types/org";

type UseOrgAdminActivityResult = {
  items: OrgAdminActivityItem[] | null;
  isLoading: boolean;
  error: string | null;
};

export function useOrgAdminActivityStrip(): UseOrgAdminActivityResult {
  const { org, isLoading: isOrgLoading } = useCurrentOrg();
  const [items, setItems] = useState<OrgAdminActivityItem[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOrgLoading || !org) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const res = await fetch(`/api/org/${org.id}/activity/admin`);
        const json = await res.json();

        if (cancelled) return;

        if (!res.ok || !json.ok) {
          setError(json?.error?.message ?? "Failed to load admin activity.");
          setItems(null);
          setIsLoading(false);
          return;
        }

        setItems(json.data as OrgAdminActivityItem[]);
        setIsLoading(false);
      } catch (err: unknown) {
        if (cancelled) return;
        console.error("[useOrgAdminActivityStrip]", err);
        setError("Failed to load admin activity.");
        setItems(null);
        setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [org, isOrgLoading]);

  if (isOrgLoading || !org) {
    return {
      items: null,
      isLoading: true,
      error: null,
    };
  }

  return { items, isLoading, error };
}

