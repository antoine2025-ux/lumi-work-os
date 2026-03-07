/**
 * Shared style constants for People page components
 * Ensures consistency with Org Chart and Overview pages
 */

import { cn } from "@/lib/utils";

// Surface card styling (matches Org Chart tiles)
export const surfaceCardClass = cn(
  "rounded-3xl",
  "bg-card/80",
  "border border-white/5",
  "shadow-[0_24px_80px_rgba(0,0,0,0.25)]",
  "transition-all duration-200"
);

// Surface card hover state
export const surfaceCardHoverClass = cn(
  "hover:border-white/10",
  "hover:-translate-y-[1px]",
  "hover:shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
);

// Chip base styling (consistent across all chips)
export const chipBaseClass = cn(
  "inline-flex items-center",
  "rounded-full",
  "px-2.5 py-1",
  "text-[10px] font-medium",
  "border",
  "transition-colors duration-150"
);

// Chip inactive state
export const chipInactiveClass = cn(
  chipBaseClass,
  "bg-muted/50",
  "text-muted-foreground",
  "border-border/50",
  "hover:bg-muted/70",
  "hover:border-slate-600/50"
);

// Chip active state (primary accent)
export const chipActiveClass = cn(
  chipBaseClass,
  "bg-primary/20",
  "text-primary",
  "border-primary/30",
  "ring-1 ring-primary/60"
);

// Muted label styling (for section headers, meta text)
export const mutedLabelClass = cn(
  "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
);

// Body text styling
export const bodyTextClass = cn(
  "text-[13px] text-foreground"
);

// Muted body text
export const mutedBodyTextClass = cn(
  "text-[13px] text-muted-foreground"
);

// Table header styling
export const tableHeaderClass = cn(
  "text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
);

// Focus ring (consistent across all interactive elements)
export const focusRingClass = cn(
  "focus-visible:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-primary/60",
  "focus-visible:ring-offset-2",
  "focus-visible:ring-offset-slate-900"
);

