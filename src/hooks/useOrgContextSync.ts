// src/hooks/useOrgContextSync.ts

"use client";

import { useState, useCallback } from "react";

type SyncState = "idle" | "loading" | "success" | "error";

export interface ContextItemMetadata {
  id: string;
  workspaceId: string;
  type: string;
  contextId: string;
  title: string;
  summary: string | null;
  updatedAt: string;
}

export interface OrgContextSyncResponse {
  ok: boolean;
  workspaceItem?: ContextItemMetadata;
  orgItem?: ContextItemMetadata;
  departmentItems?: ContextItemMetadata[];
  teamItems?: ContextItemMetadata[];
  personItems?: ContextItemMetadata[];
  roleItems?: ContextItemMetadata[];
  error?: string;
  detail?: string;
}

export function useOrgContextSync() {
  const [state, setState] = useState<SyncState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [workspaceItem, setWorkspaceItem] =
    useState<ContextItemMetadata | null>(null);
  const [orgItem, setOrgItem] =
    useState<ContextItemMetadata | null>(null);
  const [departmentItems, setDepartmentItems] = useState<
    ContextItemMetadata[]
  >([]);
  const [teamItems, setTeamItems] = useState<ContextItemMetadata[]>([]);
  const [personItems, setPersonItems] = useState<ContextItemMetadata[]>([]);
  const [roleItems, setRoleItems] = useState<ContextItemMetadata[]>([]);

  const runSync = useCallback(async () => {
    setState("loading");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/loopbrain/org/context/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const json = (await res.json()) as OrgContextSyncResponse;

      if (!res.ok || !json.ok) {
        const detail =
          json.detail ||
          json.error ||
          `HTTP ${res.status.toString()}`;
        throw new Error(detail);
      }

      setWorkspaceItem(json.workspaceItem ?? null);
      setOrgItem(json.orgItem ?? null);
      setDepartmentItems(json.departmentItems ?? []);
      setTeamItems(json.teamItems ?? []);
      setPersonItems(json.personItems ?? []);
      setRoleItems(json.roleItems ?? []);

      setState("success");
    } catch (err: unknown) {
      console.error("useOrgContextSync error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to sync org context");
      setState("error");
    }
  }, []);

  return {
    state,
    errorMessage,
    workspaceItem,
    orgItem,
    departmentItems,
    teamItems,
    personItems,
    roleItems,
    runSync,
  };
}

