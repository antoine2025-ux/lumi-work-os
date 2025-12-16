/**
 * Accent color system for departments
 * Each department gets a unique, subtle accent color
 */

export type DepartmentAccent = {
  iconBg: string;
  iconBorder: string;
  iconGlow: string;
  headerGlow: string;
  selectedOutline: string;
  chipBg?: string;
  topBorderColor?: string; // RGBA color for subtle top border
};

const accentPalette: DepartmentAccent[] = [
  // Design → teal
  {
    iconBg: "bg-gradient-to-br from-teal-500/30 via-cyan-500/25 to-teal-600/30",
    iconBorder: "border-teal-400/40",
    iconGlow: "shadow-[0_0_30px_rgba(20,184,166,0.35)]",
    headerGlow: "shadow-[0_0_24px_rgba(20,184,166,0.2)]",
    selectedOutline: "border-teal-400/60",
    chipBg: "bg-teal-500/10",
    topBorderColor: "rgba(20, 184, 166, 0.4)",
  },
  // Engineering → electric blue
  {
    iconBg: "bg-gradient-to-br from-blue-500/40 via-sky-500/30 to-blue-600/40",
    iconBorder: "border-blue-400/40",
    iconGlow: "shadow-[0_0_30px_rgba(59,130,246,0.45)]",
    headerGlow: "shadow-[0_0_24px_rgba(59,130,246,0.25)]",
    selectedOutline: "border-blue-400/60",
    chipBg: "bg-blue-500/10",
    topBorderColor: "rgba(59, 130, 246, 0.4)",
  },
  // Marketing → magenta/pink
  {
    iconBg: "bg-gradient-to-br from-pink-500/30 via-rose-500/25 to-fuchsia-500/30",
    iconBorder: "border-pink-400/40",
    iconGlow: "shadow-[0_0_30px_rgba(236,72,153,0.35)]",
    headerGlow: "shadow-[0_0_24px_rgba(236,72,153,0.2)]",
    selectedOutline: "border-pink-400/60",
    chipBg: "bg-pink-500/10",
    topBorderColor: "rgba(236, 72, 153, 0.4)",
  },
  // Product → purple
  {
    iconBg: "bg-gradient-to-br from-purple-500/30 via-violet-500/25 to-purple-600/30",
    iconBorder: "border-purple-400/40",
    iconGlow: "shadow-[0_0_30px_rgba(168,85,247,0.35)]",
    headerGlow: "shadow-[0_0_24px_rgba(168,85,247,0.2)]",
    selectedOutline: "border-purple-400/60",
    chipBg: "bg-purple-500/10",
    topBorderColor: "rgba(168, 85, 247, 0.4)",
  },
  // Sales → amber
  {
    iconBg: "bg-gradient-to-br from-amber-500/30 via-yellow-500/25 to-orange-500/30",
    iconBorder: "border-amber-400/40",
    iconGlow: "shadow-[0_0_30px_rgba(245,158,11,0.35)]",
    headerGlow: "shadow-[0_0_24px_rgba(245,158,11,0.2)]",
    selectedOutline: "border-amber-400/60",
    chipBg: "bg-amber-500/10",
    topBorderColor: "rgba(245, 158, 11, 0.4)",
  },
  // Operations → green
  {
    iconBg: "bg-gradient-to-br from-green-500/30 via-emerald-500/25 to-green-600/30",
    iconBorder: "border-green-400/40",
    iconGlow: "shadow-[0_0_30px_rgba(34,197,94,0.35)]",
    headerGlow: "shadow-[0_0_24px_rgba(34,197,94,0.2)]",
    selectedOutline: "border-green-400/60",
    chipBg: "bg-green-500/10",
    topBorderColor: "rgba(34, 197, 94, 0.4)",
  },
  // People → soft cyan
  {
    iconBg: "bg-gradient-to-br from-cyan-500/30 via-sky-500/25 to-cyan-600/30",
    iconBorder: "border-cyan-400/40",
    iconGlow: "shadow-[0_0_30px_rgba(6,182,212,0.35)]",
    headerGlow: "shadow-[0_0_24px_rgba(6,182,212,0.2)]",
    selectedOutline: "border-cyan-400/60",
    chipBg: "bg-cyan-500/10",
    topBorderColor: "rgba(6, 182, 212, 0.4)",
  },
];

/**
 * Get accent color for a department by index
 * Cycles through the palette
 */
export function getDepartmentAccent(index: number): DepartmentAccent {
  return accentPalette[index % accentPalette.length];
}

