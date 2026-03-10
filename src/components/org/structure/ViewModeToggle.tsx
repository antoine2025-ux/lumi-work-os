"use client";

import { cn } from "@/lib/utils";
import type { ViewMode } from "./types";

type ViewModeToggleProps = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
};

/**
 * Segmented control for switching between List and Tree view modes
 * Premium pill-style toggle matching the spec
 */
export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <div className="inline-flex items-center rounded-full bg-card/70 border border-border/80 p-1 gap-1">
      <button
        type="button"
        onClick={() => onChange("list")}
        className={cn(
          "rounded-full px-3 py-1 text-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70",
          value === "list"
            ? "bg-slate-100 text-slate-900 font-semibold shadow-sm"
            : "text-muted-foreground hover:bg-muted/80"
        )}
        aria-pressed={value === "list"}
      >
        List
      </button>
      <button
        type="button"
        onClick={() => onChange("tree")}
        className={cn(
          "rounded-full px-3 py-1 text-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70",
          value === "tree"
            ? "bg-slate-100 text-slate-900 font-semibold shadow-sm"
            : "text-muted-foreground hover:bg-muted/80"
        )}
        aria-pressed={value === "tree"}
      >
        Tree
      </button>
    </div>
  );
}

