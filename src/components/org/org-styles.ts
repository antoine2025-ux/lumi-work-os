/**
 * Shared style constants for Org Center
 * Ensures consistent visual language across all tabs
 */

// Surface cards (insights, empty states, etc.)
export const orgSurfaceCardClass =
  "rounded-3xl bg-slate-900/80 border border-white/5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]";

// Chips and pills
export const orgChipBaseClass =
  "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium transition-colors select-none cursor-pointer whitespace-nowrap";

export const orgChipInactiveClass =
  "bg-slate-800/50 text-slate-400 hover:bg-slate-800/70 hover:text-slate-200";

export const orgChipActiveClass =
  "bg-primary/20 text-primary ring-1 ring-primary/60";

// Labels and typography
export const orgMutedLabelClass =
  "text-xs font-semibold uppercase tracking-wider text-slate-500";

// Focus rings
export const orgFocusRingClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-0";

// Hover transitions
export const orgHoverTransitionClass = "transition-all duration-200";

// Color semantics
export const orgColorSemantics = {
  // Primary accent: navigation, active state
  primary: "text-primary hover:text-primary/80",
  primaryBg: "bg-primary/20 text-primary",
  
  // Blue/teal: structure & hierarchy
  structure: "text-blue-400 hover:text-blue-300",
  structureBg: "bg-blue-500/10 text-blue-400",
  
  // Neutral: data, labels, counts
  neutral: "text-slate-400",
  neutralBg: "bg-slate-800/50",
  
  // Warning/muted: missing or incomplete data
  warning: "text-amber-400",
  warningBg: "bg-amber-500/10 text-amber-400",
  muted: "text-slate-500 italic",
} as const;

