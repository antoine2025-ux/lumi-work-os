"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDepartmentAccent } from "@/components/org/structure/accent-colors";
import type { OrgChartNode } from "@/lib/org/projections/buildOrgChartTree";

type OrgChartNodeCardProps = {
  node: OrgChartNode;
  isHovered: boolean;
  isCurrentUser?: boolean;
  onHover: (hovered: boolean) => void;
  onClick: () => void;
};

// Map department names to consistent accent indices
const DEPARTMENT_ACCENT_MAP: Record<string, number> = {
  'Design': 0,
  'Engineering': 1,
  'Marketing': 2,
  'Product': 3,
  'Sales': 4,
  'Operations': 5,
  'People': 6,
};

/**
 * Get accent index for a department name
 * Uses predefined mapping or hashes unknown department names
 */
function getDepartmentIndex(departmentName?: string): number {
  if (!departmentName) return 0;
  return DEPARTMENT_ACCENT_MAP[departmentName] ?? Math.abs(hashString(departmentName)) % 7;
}

/**
 * Simple string hash function for consistent color assignment
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

/**
 * OrgChartNodeCard
 * 
 * Professional org chart node component using HTML/Tailwind instead of SVG.
 * Follows the same design patterns as OrgStructureTeamCard and OrgDepartmentRow.
 * 
 * Features:
 * - Department accent colors from accent-colors.ts
 * - Proper hover states with lift effect
 * - Automatic text truncation
 * - Root node (CEO) distinction with amber accent
 * - Direct report count badge
 * - Vacant position handling
 */
export function OrgChartNodeCard({ node, isHovered, isCurrentUser, onHover, onClick }: OrgChartNodeCardProps) {
  const isRoot = !node.parentId;
  const isVacant = node.isVacant;
  const accent = getDepartmentAccent(getDepartmentIndex(node.departmentName));
  
  // Name to display (person name or position title for vacant)
  const displayName = node.personName || node.positionTitle || "Unknown";
  
  // Secondary text (position title if person is assigned, otherwise team/dept)
  const secondaryText = !isVacant && node.positionTitle 
    ? node.positionTitle 
    : (node.teamName || node.departmentName);
  
  // Tertiary text (team/dept when person has position title)
  const tertiaryText = !isVacant && node.positionTitle 
    ? (node.teamName || node.departmentName)
    : undefined;

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-card/80 p-3.5 cursor-pointer",
        "transition-all duration-150",
        "shadow-[0_8px_24px_rgba(0,0,0,0.4)]",
        // Hover effects
        isHovered && "bg-card/90 -translate-y-[1px]",
        isHovered && "shadow-[0_12px_32px_rgba(0,0,0,0.5)]",
        // Current user: primary border and glow
        isCurrentUser && "border-2 border-primary ring-2 ring-primary/20",
        // Root node gets amber border and glow (unless current user)
        !isCurrentUser && isRoot && "border-amber-400/30 shadow-[0_0_24px_rgba(251,146,60,0.15)]",
        !isCurrentUser && isRoot && isHovered && "border-amber-400/40 shadow-[0_0_32px_rgba(251,146,60,0.2)]",
        // Regular nodes get subtle white border
        !isCurrentUser && !isRoot && "border-white/5",
        !isCurrentUser && !isRoot && isHovered && "border-white/10",
        // Vacant positions are slightly dimmed
        isVacant && "opacity-80"
      )}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onClick}
      style={{ width: '200px', minHeight: '120px' }}
    >
      {/* "You" badge for current user */}
      {isCurrentUser && (
        <span className="absolute -top-1.5 -right-1.5 inline-flex items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground shadow-sm">
          You
        </span>
      )}
      {/* Header: Icon + Name */}
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0",
            "transition-all",
            isRoot ? "bg-gradient-to-br from-amber-500/30 via-yellow-500/25 to-orange-500/30" : accent.iconBg,
            isRoot ? "border border-amber-400/40" : "border border-border/50",
            "shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
            isHovered && "shadow-[0_6px_16px_rgba(0,0,0,0.4)]"
          )}
        >
          <User className="h-4 w-4 text-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "text-sm font-semibold leading-snug truncate",
              isVacant ? "text-muted-foreground" : "text-foreground"
            )}
            title={displayName}
          >
            {displayName}
          </div>
        </div>
      </div>

      {/* Secondary text: Position title or team/dept */}
      {secondaryText && (
        <div
          className="text-xs text-muted-foreground truncate mb-1"
          title={secondaryText}
        >
          {secondaryText}
        </div>
      )}

      {/* Tertiary text: Team/dept when person has position */}
      {tertiaryText && (
        <div
          className="text-[11px] text-muted-foreground truncate"
          title={tertiaryText}
        >
          {tertiaryText}
        </div>
      )}

      {/* Flexible spacer */}
      <div className="flex-1" />

      {/* Direct report count badge */}
      {node.childCount > 0 && (
        <div className="mt-2 flex items-center justify-center">
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-full px-2.5 py-0.5",
              "text-xs font-medium",
              "bg-muted/70 border border-border/50 text-muted-foreground"
            )}
          >
            {node.childCount} {node.childCount === 1 ? 'report' : 'reports'}
          </span>
        </div>
      )}

      {/* Vacant indicator */}
      {isVacant && (
        <div className="mt-2 flex items-center justify-center">
          <span className="inline-flex items-center text-[10px] uppercase tracking-wider text-amber-400/80">
            Vacant
          </span>
        </div>
      )}
    </div>
  );
}
