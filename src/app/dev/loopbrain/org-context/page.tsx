// src/app/dev/loopbrain/org-context/page.tsx

"use client";

import { useOrgContextSync } from "@/hooks/useOrgContextSync";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function OrgContextDevPage() {
  const {
    state,
    errorMessage,
    workspaceItem,
    orgItem,
    departmentItems,
    teamItems,
    personItems,
    roleItems,
    runSync,
  } = useOrgContextSync();

  const isLoading = state === "loading";

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Loopbrain · Org Context Dev View
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inspect Org → ContextObject → Loopbrain sync for the current workspace.
          </p>
        </div>
        <Button onClick={runSync} disabled={isLoading}>
          {isLoading ? "Syncing..." : "Sync Org Context"}
        </Button>
      </div>

      {state === "error" && errorMessage && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {state === "success" && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-600">
          Org context synced successfully.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Workspace */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Workspace Context</span>
              <span className="text-xs font-normal text-muted-foreground">
                type = workspace
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {workspaceItem ? (
              <>
                <div>
                  <span className="font-medium">Context ID:</span>{" "}
                  {workspaceItem.contextId}
                </div>
                <div>
                  <span className="font-medium">Title:</span>{" "}
                  {workspaceItem.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  Updated:{" "}
                  {new Date(workspaceItem.updatedAt).toLocaleString()}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">
                Not synced yet. Click "Sync Org Context".
              </div>
            )}
          </CardContent>
        </Card>

        {/* Org */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Org Context</span>
              <span className="text-xs font-normal text-muted-foreground">
                type = org
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {orgItem ? (
              <>
                <div>
                  <span className="font-medium">Context ID:</span>{" "}
                  {orgItem.contextId}
                </div>
                <div>
                  <span className="font-medium">Title:</span>{" "}
                  {orgItem.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  Updated: {new Date(orgItem.updatedAt).toLocaleString()}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Departments: {departmentItems.length} · Teams:{" "}
                  {teamItems.length} · People: {personItems.length} · Roles:{" "}
                  {roleItems.length}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">
                Not synced yet. Click "Sync Org Context".
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Context Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              <span className="font-medium">Departments:</span>{" "}
              {departmentItems.length}
            </div>
            <div>
              <span className="font-medium">Teams:</span>{" "}
              {teamItems.length}
            </div>
            <div>
              <span className="font-medium">People:</span>{" "}
              {personItems.length}
            </div>
            <div>
              <span className="font-medium">Roles/Positions:</span>{" "}
              {roleItems.length}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Use this view to quickly sanity-check that all org layers
              are synced into the Context Store.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent items list */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Departments (sample)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {departmentItems.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No department context items yet.
              </div>
            ) : (
              <ul className="space-y-1">
                {departmentItems.slice(0, 6).map((item) => (
                  <li
                    key={item.id}
                    className="rounded-md border px-2 py-1 text-xs"
                  >
                    <div className="font-medium truncate">
                      {item.title}
                    </div>
                    <div className="text-muted-foreground truncate">
                      {item.contextId}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teams (sample)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {teamItems.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No team context items yet.
              </div>
            ) : (
              <ul className="space-y-1">
                {teamItems.slice(0, 6).map((item) => (
                  <li
                    key={item.id}
                    className="rounded-md border px-2 py-1 text-xs"
                  >
                    <div className="font-medium truncate">
                      {item.title}
                    </div>
                    <div className="text-muted-foreground truncate">
                      {item.contextId}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>People (sample)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {personItems.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No person context items yet.
              </div>
            ) : (
              <ul className="space-y-1">
                {personItems.slice(0, 6).map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs",
                      item.title?.toLowerCase().includes("context")
                        ? ""
                        : "border-amber-500/60 bg-amber-500/5"
                    )}
                  >
                    <div className="font-medium truncate">
                      {item.title}
                    </div>
                    <div className="text-muted-foreground truncate">
                      {item.contextId}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roles / Positions (sample)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {roleItems.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No role context items yet.
              </div>
            ) : (
              <ul className="space-y-1">
                {roleItems.slice(0, 6).map((item) => (
                  <li
                    key={item.id}
                    className="rounded-md border px-2 py-1 text-xs"
                  >
                    <div className="font-medium truncate">
                      {item.title}
                    </div>
                    <div className="text-muted-foreground truncate">
                      {item.contextId}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

