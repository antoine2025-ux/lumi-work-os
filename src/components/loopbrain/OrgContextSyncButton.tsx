// src/components/loopbrain/OrgContextSyncButton.tsx

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

type SyncState = "idle" | "loading" | "success" | "error";

interface ContextItemMetadata {
  id: string;
  workspaceId: string;
  type: string;
  contextId: string;
  title: string;
  summary: string | null;
  updatedAt: string;
}

interface OrgContextSyncResponse {
  ok: boolean;
  workspaceItem?: ContextItemMetadata;
  orgItem?: ContextItemMetadata;
  departmentItems?: ContextItemMetadata[];
  teamItems?: ContextItemMetadata[];
  personItems?: ContextItemMetadata[];
  error?: string;
  detail?: string;
}

export function OrgContextSyncButton() {
  const [state, setState] = useState<SyncState>("idle");
  const [workspaceItem, setWorkspaceItem] =
    useState<ContextItemMetadata | null>(null);
  const [orgItem, setOrgItem] = useState<ContextItemMetadata | null>(null);
  const [departmentItemsCount, setDepartmentItemsCount] = useState<number>(0);
  const [teamItemsCount, setTeamItemsCount] = useState<number>(0);
  const [personItemsCount, setPersonItemsCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSyncClick() {
    setState("loading");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/loopbrain/org/context/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as OrgContextSyncResponse | null;
        const detail =
          body?.detail || body?.error || `HTTP ${res.status.toString()}`;
        throw new Error(detail);
      }

      const json = (await res.json()) as OrgContextSyncResponse;

      if (!json.ok) {
        throw new Error(json.detail || json.error || "Unknown error");
      }

      setWorkspaceItem(json.workspaceItem ?? null);
      setOrgItem(json.orgItem ?? null);
      setDepartmentItemsCount(json.departmentItems?.length ?? 0);
      setTeamItemsCount(json.teamItems?.length ?? 0);
      setPersonItemsCount(json.personItems?.length ?? 0);
      setState("success");
    } catch (err: unknown) {
      console.error("OrgContextSyncButton error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to sync org context");
      setState("error");
    }
  }

  const isLoading = state === "loading";

  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b pb-3">
        <div>
          <h2 className="text-sm font-medium">Org Workspace Context Sync</h2>
          <p className="text-xs text-muted-foreground">
            Trigger a fresh Org Workspace Context sync for the current
            workspace (Loopbrain-ready ContextItem).
          </p>
        </div>

        <Button
          type="button"
          onClick={handleSyncClick}
          disabled={isLoading}
          className="whitespace-nowrap"
        >
          {isLoading ? "Syncing…" : "Sync Org Context"}
        </Button>
      </div>

      <div className="mt-2 space-y-2 text-xs">
        <div>
          Status:{" "}
          <span
            className={
              state === "success"
                ? "text-emerald-600 font-medium"
                : state === "error"
                ? "text-red-600 font-medium"
                : state === "loading"
                ? "text-amber-600 font-medium"
                : "text-muted-foreground"
            }
          >
            {state === "idle" && "Idle"}
            {state === "loading" && "Sync in progress…"}
            {state === "success" && "Last sync succeeded"}
            {state === "error" && "Last sync failed"}
          </span>
        </div>

        {workspaceItem && (
          <div className="space-y-1 rounded-lg bg-muted/40 p-2">
            <div className="font-medium text-xs">Workspace ContextItem</div>
            <div>
              <span className="font-medium">Type:</span> {workspaceItem.type}
            </div>
            <div>
              <span className="font-medium">Context ID:</span>{" "}
              <span className="font-mono text-[10px]">{workspaceItem.contextId}</span>
            </div>
            <div>
              <span className="font-medium">Updated at:</span>{" "}
              {new Date(workspaceItem.updatedAt).toLocaleString()}
            </div>
            <div className="truncate">
              <span className="font-medium">Title:</span> {workspaceItem.title}
            </div>
          </div>
        )}

        {orgItem && (
          <div className="mt-2 space-y-1 rounded-lg bg-muted/40 p-2">
            <div className="font-medium text-xs">Org ContextItem</div>
            <div>
              <span className="font-medium">Type:</span> {orgItem.type}
            </div>
            <div>
              <span className="font-medium">Context ID:</span>{" "}
              <span className="font-mono text-[10px]">{orgItem.contextId}</span>
            </div>
            <div>
              <span className="font-medium">Updated at:</span>{" "}
              {new Date(orgItem.updatedAt).toLocaleString()}
            </div>
            <div className="truncate">
              <span className="font-medium">Title:</span> {orgItem.title}
            </div>
            <div>
              <span className="font-medium">Departments synced:</span>{" "}
              {departmentItemsCount}
            </div>
            <div>
              <span className="font-medium">Teams synced:</span>{" "}
              {teamItemsCount}
            </div>
            <div>
              <span className="font-medium">People synced:</span>{" "}
              {personItemsCount}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg bg-destructive/10 p-2 text-red-600">
            Error: <span className="font-mono text-[10px]">{errorMessage}</span>
          </div>
        )}
      </div>

      <div className="text-[10px] text-muted-foreground">
        Uses: <code>POST /api/loopbrain/org/context/sync</code>
      </div>
    </div>
  );
}

