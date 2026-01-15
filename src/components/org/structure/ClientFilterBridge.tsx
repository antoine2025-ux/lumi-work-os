"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { StructureFilters, StructureFilterKey } from "@/components/org/structure/StructureFilters";

export function ClientFilterBridge(props: { 
  initialQ: string; 
  initialFilter: StructureFilterKey; 
  counts?: Partial<Record<StructureFilterKey, number>>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const q = sp.get("q") ?? props.initialQ ?? "";
  const filter = (sp.get("filter") ?? props.initialFilter ?? "all") as StructureFilterKey;

  const setParam = React.useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(sp.toString());
      if (!value) next.delete(key);
      else next.set(key, value);
      router.replace(`${pathname}?${next.toString()}`);
    },
    [router, pathname, sp]
  );

  return (
    <StructureFilters
      search={q}
      onSearchChange={(v) => setParam("q", v)}
      filter={filter}
      onFilterChange={(v) => setParam("filter", v)}
      counts={props.counts}
    />
  );
}

