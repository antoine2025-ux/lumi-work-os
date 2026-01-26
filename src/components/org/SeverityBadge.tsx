"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * SeverityBadge handles two semantic domains:
 * - Impact severity: LOW | MEDIUM | HIGH (for work impacts)
 * - Issue severity: error | warning | info (for org issues)
 * 
 * Visual mapping:
 * - error → red (destructive) - Blocking
 * - warning → amber - Needs attention
 * - info → muted - Context
 * - HIGH → red (destructive) - High impact
 * - MEDIUM → amber - Medium impact
 * - LOW → muted - Low impact
 */
export function SeverityBadge({ 
  severity 
}: { 
  severity: "error" | "warning" | "info" | "LOW" | "MEDIUM" | "HIGH" 
}) {
  // Issue severity (error/warning/info)
  if (severity === "error") {
    return (
      <Badge variant="destructive" className="text-[10px]">
        Critical
      </Badge>
    );
  }
  
  if (severity === "warning") {
    return (
      <Badge
        variant="secondary"
        className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
      >
        Warning
      </Badge>
    );
  }
  
  if (severity === "info") {
    return (
      <Badge variant="outline" className="text-[10px]">
        Info
      </Badge>
    );
  }
  
  // Impact severity (LOW/MEDIUM/HIGH)
  if (severity === "HIGH") {
    return <Badge variant="destructive" className="text-[10px]">{severity}</Badge>;
  }
  
  if (severity === "MEDIUM") {
    return (
      <Badge
        variant="secondary"
        className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
      >
        {severity}
      </Badge>
    );
  }
  
  // LOW
  return <Badge variant="outline" className="text-[10px]">{severity}</Badge>;
}

