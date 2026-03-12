"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PeopleFilters } from "./people-filters";
import { cn } from "@/lib/utils";

type PeopleSortControlsProps = {
  filters: PeopleFilters;
};

const SORT_OPTIONS: { value: PeopleFilters["sort"]; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "joinedAt", label: "Join date" },
  { value: "role", label: "Role" },
];

export function PeopleSortControls({ filters }: PeopleSortControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sort = filters.sort ?? "name";
  const direction = filters.direction ?? "asc";

  function updateSort(nextSort: PeopleFilters["sort"]) {
    const params = new URLSearchParams(searchParams.toString());
    if (!nextSort) {
      params.delete("sort");
      params.delete("direction");
    } else {
      params.set("sort", nextSort);
      // Keep direction when possible; fallback to asc.
      params.set("direction", direction || "asc");
    }

    router.push(`/org/directory${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function toggleDirection() {
    const params = new URLSearchParams(searchParams.toString());
    const nextDirection = direction === "asc" ? "desc" : "asc";
    params.set("direction", nextDirection);
    // Ensure sort has some value if direction exists
    params.set("sort", sort || "name");

    router.push(`/org/directory${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-[11px] text-muted-foreground">Sort by</span>
      <select
        value={sort}
        onChange={(e) => updateSort(e.target.value as PeopleFilters["sort"])}
        className={cn(
          "h-7 rounded-full border border-border/70 bg-background px-3 text-[11px] text-foreground",
          "outline-none transition-colors duration-150",
          "hover:border-slate-500 focus-visible:ring-2 focus-visible:ring-[#5CA9FF] focus-visible:ring-offset-0"
        )}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value ?? "name"}>
            {opt.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={toggleDirection}
        className={cn(
          "inline-flex h-7 items-center rounded-full border border-border/70 px-2 text-[11px] text-foreground",
          "bg-background hover:border-slate-500 hover:text-foreground",
          "transition-colors duration-150",
          "focus-visible:ring-2 focus-visible:ring-[#5CA9FF] focus-visible:ring-offset-0"
        )}
        aria-label={`Sort direction: ${direction === "asc" ? "ascending" : "descending"}`}
      >
        {direction === "asc" ? "↑ A–Z" : "↓ Z–A"}
      </button>
    </div>
  );
}

