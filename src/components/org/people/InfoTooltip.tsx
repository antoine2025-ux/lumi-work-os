"use client";

import { Info } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type InfoTooltipProps = {
  content: string;
  className?: string;
};

/**
 * Small info icon with tooltip for explaining metrics and labels
 */
export function InfoTooltip({ content, className }: InfoTooltipProps) {
  return (
    <Tooltip content={content} side="top">
      <button
        type="button"
        className={cn(
          "inline-flex items-center justify-center",
          "h-3.5 w-3.5 rounded-full",
          "text-slate-400 hover:text-slate-300",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
          className
        )}
        aria-label="More information"
      >
        <Info className="h-3 w-3" />
      </button>
    </Tooltip>
  );
}

