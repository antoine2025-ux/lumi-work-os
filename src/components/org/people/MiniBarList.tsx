"use client";

import { cn } from "@/lib/utils";

type MiniBarItem = {
  label: string;
  value: number;
};

type MiniBarListProps = {
  items: MiniBarItem[];
  maxItems?: number;
  className?: string;
};

/**
 * Mini bar chart component for showing distributions
 * Used for top departments, teams, etc.
 */
export function MiniBarList({ items, maxItems = 5, className }: MiniBarListProps) {
  if (items.length === 0) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>
        No data available
      </div>
    );
  }

  const displayItems = items.slice(0, maxItems);
  const maxValue = Math.max(...displayItems.map((item) => item.value), 1);

  return (
    <div className={cn("space-y-1.5", className)}>
      {displayItems.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground truncate flex-1 min-w-0 mr-2">
              {item.label}
            </span>
            <span className="text-muted-foreground font-medium tabular-nums shrink-0">
              {item.value}
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-muted/50 overflow-hidden">
            <div
              className="h-full bg-primary/40 rounded-full transition-all"
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

