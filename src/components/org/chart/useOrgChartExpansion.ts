"use client";

import { useState } from "react";
import { OrgChartExpandState } from "./OrgChart.types";

export function useOrgChartExpansion() {
  const [state, setState] = useState<OrgChartExpandState>({
    expanded: {},
  });

  function toggle(id: string) {
    setState((prev) => ({
      expanded: {
        ...prev.expanded,
        [id]: !prev.expanded[id],
      },
    }));
  }

  function isExpanded(id: string) {
    return !!state.expanded[id];
  }

  return { isExpanded, toggle };
}

