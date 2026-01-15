// src/components/debug/OrgRoutingBadge.tsx

"use client";

import { cn } from "@/lib/utils";

export interface OrgRoutingBadgeProps {
  contextType: string;
  confidence: number;
  itemCount: number;
  usedFallback: boolean;
  enabled: boolean; // dev-mode toggle
}

/**
 * Dev-only badge showing Org routing debug information.
 * Positioned in top-right corner of chat area.
 */
export function OrgRoutingBadge({
  contextType,
  confidence,
  itemCount,
  usedFallback,
  enabled,
}: OrgRoutingBadgeProps) {
  if (!enabled) return null;

  // Determine color based on confidence and fallback
  let badgeColor: string;
  let textColor: string;
  let borderColor: string;

  if (usedFallback || confidence < 0.4) {
    // Red: fallback or low confidence
    badgeColor = "bg-red-900/20";
    textColor = "text-red-300";
    borderColor = "border-red-700/50";
  } else if (confidence >= 0.7) {
    // Green: high confidence
    badgeColor = "bg-emerald-900/20";
    textColor = "text-emerald-300";
    borderColor = "border-emerald-700/50";
  } else {
    // Yellow: medium confidence
    badgeColor = "bg-amber-900/20";
    textColor = "text-amber-300";
    borderColor = "border-amber-700/50";
  }

  const confidencePercent = Math.round(confidence * 100);

  return (
    <div
      className={cn(
        "absolute top-4 right-4 z-50 rounded-lg border px-3 py-2 text-xs font-mono shadow-lg backdrop-blur-sm",
        badgeColor,
        textColor,
        borderColor,
        "pointer-events-none" // Don't block clicks
      )}
      style={{ maxWidth: "280px" }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-semibold">Org Routing</span>
        {usedFallback && (
          <span className="text-[10px] text-red-400">FALLBACK</span>
        )}
      </div>
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Type:</span>
          <span className="font-semibold">{contextType}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Confidence:</span>
          <span>{confidencePercent}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Items:</span>
          <span>{itemCount}</span>
        </div>
      </div>
    </div>
  );
}

