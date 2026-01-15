"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StructureFilterKey = "all" | "missing-owner" | "empty" | "unassigned";

export function StructureFilters(props: {
  search: string;
  onSearchChange: (v: string) => void;
  filter: StructureFilterKey;
  onFilterChange: (v: StructureFilterKey) => void;
  counts?: Partial<Record<StructureFilterKey, number>>;
}) {
  const { search, onSearchChange, filter, onFilterChange, counts } = props;

  const pills: Array<{ key: StructureFilterKey; label: string }> = [
    { key: "all", label: "All" },
    { key: "missing-owner", label: "Missing owner" },
    { key: "empty", label: "Empty" },
    { key: "unassigned", label: "Unassigned" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search departments and teams..."
          className="h-10"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {pills.map((p) => {
          const active = filter === p.key;
          const count = counts?.[p.key];
          return (
            <Button
              key={p.key}
              type="button"
              variant={active ? "default" : "secondary"}
              className={cn("h-8 rounded-full px-3 text-sm", !active && "opacity-90")}
              onClick={() => onFilterChange(p.key)}
            >
              <span>{p.label}</span>
              {typeof count === "number" && (
                <Badge
                  variant={active ? "secondary" : "outline"}
                  className="ml-2 rounded-full px-2 py-0 text-[11px]"
                >
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

