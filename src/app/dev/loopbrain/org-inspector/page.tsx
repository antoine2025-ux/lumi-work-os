// src/app/dev/loopbrain/org-inspector/page.tsx

"use client";

import { useMemo, useState } from "react";
import { useOrgLoopbrainGraph, type OrgLoopbrainContextObject } from "@/hooks/useOrgLoopbrainGraph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  org: "Org",
  department: "Department",
  team: "Team",
  role: "Role",
  person: "Person",
};

const TYPE_COLORS: Record<string, string> = {
  org: "bg-blue-100 text-blue-800",
  department: "bg-purple-100 text-purple-800",
  team: "bg-emerald-100 text-emerald-800",
  role: "bg-amber-100 text-amber-800",
  person: "bg-slate-100 text-slate-800",
};

export default function OrgInspectorPage() {
  const { loading, error, bundle, reload } = useOrgLoopbrainGraph();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allNodes = useMemo(() => {
    if (!bundle) return [];

    const nodes = [
      ...(bundle.primary ? [bundle.primary] : []),
      ...bundle.related,
    ];

    const uniqueById = new Map<string, OrgLoopbrainContextObject>();
    for (const n of nodes) {
      uniqueById.set(n.id, n);
    }
    return Array.from(uniqueById.values());
  }, [bundle]);

  const filteredNodes = useMemo(() => {
    let nodes = allNodes;

    if (typeFilter !== "all") {
      nodes = nodes.filter((n) => n.type === typeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      nodes = nodes.filter(
        (n) =>
          n.id.toLowerCase().includes(q) ||
          n.title.toLowerCase().includes(q)
      );
    }

    return nodes;
  }, [allNodes, typeFilter, search]);

  const selectedNode = useMemo(() => {
    if (!bundle || !selectedId) return null;

    return bundle.byId[selectedId] ?? null;
  }, [bundle, selectedId]);

  const metrics = useMemo(() => {
    const result = {
      org: 0,
      department: 0,
      team: 0,
      role: 0,
      person: 0,
    };

    for (const n of allNodes) {
      if (n.type === "org") result.org++;
      if (n.type === "department") result.department++;
      if (n.type === "team") result.team++;
      if (n.type === "role") result.role++;
      if (n.type === "person") result.person++;
    }

    return result;
  }, [allNodes]);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Loopbrain Org Inspector
          </h1>
          <p className="text-sm text-muted-foreground">
            Visual inspection of the Org Loopbrain context graph as seen by
            the Context Store.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => reload()}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Reload Graph"}
          </Button>
        </div>
      </div>

      {/* Error / loading states */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">
              Failed to load org graph
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Metrics + filters */}
      <div className="grid gap-4 md:grid-cols-[2fr,3fr]">
        {/* Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Graph Metrics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
            <Metric
              label="Org root"
              value={metrics.org}
              muted="Single org node expected"
            />
            <Metric label="Departments" value={metrics.department} />
            <Metric label="Teams" value={metrics.team} />
            <Metric label="Roles / Positions" value={metrics.role} />
            <Metric label="People" value={metrics.person} />
            <Metric label="Total nodes" value={allNodes.length} />
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="org">Org</SelectItem>
                <SelectItem value="department">Departments</SelectItem>
                <SelectItem value="team">Teams</SelectItem>
                <SelectItem value="role">Roles</SelectItem>
                <SelectItem value="person">People</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Search by title or id…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Main layout: nodes list + details */}
      <div className="grid gap-4 md:grid-cols-[2fr,3fr]">
        {/* Nodes list */}
        <Card className="h-[520px] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Nodes</CardTitle>
            <span className="text-xs text-muted-foreground">
              {filteredNodes.length} of {allNodes.length} shown
            </span>
          </CardHeader>
          <CardContent className="h-full overflow-auto">
            {loading && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Loading org graph…
              </div>
            )}

            {!loading && filteredNodes.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No nodes found. Try changing filters or run the org context
                sync.
              </div>
            )}

            <div className="flex flex-col gap-1">
              {filteredNodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedId(node.id)}
                  className={cn(
                    "flex w-full flex-col items-start rounded-md border px-3 py-2 text-left text-xs transition hover:bg-muted",
                    selectedId === node.id && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-transparent",
                          TYPE_COLORS[node.type] ??
                            "bg-slate-100 text-slate-800"
                        )}
                      >
                        {TYPE_LABELS[node.type] ?? node.type}
                      </Badge>
                      <span className="font-medium truncate">
                        {node.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {node.status}
                    </span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    {node.summary}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    <span className="font-mono">{node.id}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Node details */}
        <Card className="h-[520px] overflow-hidden">
          <CardHeader>
            <CardTitle>Node Details</CardTitle>
          </CardHeader>
          <CardContent className="h-full overflow-auto text-sm">
            {!selectedNode && (
              <div className="py-10 text-center text-muted-foreground">
                Select a node on the left to inspect its details and
                relations.
              </div>
            )}

            {selectedNode && (
              <div className="space-y-4">
                {/* Basic info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-transparent",
                        TYPE_COLORS[selectedNode.type] ??
                          "bg-slate-100 text-slate-800"
                      )}
                    >
                      {TYPE_LABELS[selectedNode.type] ?? selectedNode.type}
                    </Badge>
                    <span className="font-semibold">
                      {selectedNode.title}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ID: <span className="font-mono">{selectedNode.id}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Status: {selectedNode.status} • Updated:{" "}
                    {new Date(selectedNode.updatedAt).toLocaleString()}
                  </div>
                </div>

                {/* Summary */}
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                    Summary
                  </h3>
                  <p className="text-xs leading-snug">
                    {selectedNode.summary}
                  </p>
                </div>

                {/* Tags */}
                {selectedNode.tags?.length > 0 && (
                  <div className="space-y-1">
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {selectedNode.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="border-dashed text-[10px]"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Relations */}
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                    Relations
                  </h3>
                  {selectedNode.relations.length === 0 && (
                    <div className="text-xs text-muted-foreground">
                      No relations attached to this node yet.
                    </div>
                  )}

                  {selectedNode.relations.length > 0 && (
                    <div className="space-y-1">
                      {selectedNode.relations.map((rel, idx) => {
                        return (
                          <div
                            key={`${rel.type}-${rel.targetId}-${idx}`}
                            className="flex flex-col rounded-md border bg-muted/40 px-2 py-1 text-[11px]"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[10px]">
                                {rel.type}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {rel.label}
                              </span>
                            </div>
                            <div className="mt-1 grid grid-cols-1 gap-1 md:grid-cols-2">
                              <div>
                                <span className="text-[10px] text-muted-foreground">
                                  source
                                </span>
                                <div className="font-mono text-[10px]">
                                  {rel.sourceId}
                                </div>
                              </div>
                              <div>
                                <span className="text-[10px] text-muted-foreground">
                                  target
                                </span>
                                <div className="font-mono text-[10px]">
                                  {rel.targetId}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
      {muted && (
        <div className="mt-1 text-[10px] text-muted-foreground">{muted}</div>
      )}
    </div>
  );
}

