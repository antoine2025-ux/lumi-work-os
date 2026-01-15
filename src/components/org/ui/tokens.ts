// Org UI tokens - frozen for Phase D
// Visual refinement only. No new tokens without product review.

export const orgTokens = {
  // Layout
  page: "space-y-4",
  grid: "grid gap-4",
  
  // Cards (no shadows - minimal and calm)
  card: "rounded-2xl border bg-background p-6",
  sectionCard: "rounded-2xl border bg-background p-4",
  
  // Interactions
  itemHover: "hover:bg-muted/40 transition-colors",
  
  // Typography (single body size: text-sm)
  subtleText: "text-sm text-muted-foreground",
  title: "text-sm font-semibold",
  heading: "text-lg font-semibold",
  
  // Components
  chip: "rounded-full border px-2 py-0.5 text-xs text-muted-foreground",
  button: "rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors",
  buttonSecondary: "rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors",
  iconButton: "h-9 w-9 rounded-xl border bg-background hover:bg-muted/30 inline-flex items-center justify-center text-sm transition-colors",
  input: "w-full rounded-xl border bg-background px-3 py-2 text-sm",
  link: "text-sm text-primary hover:text-foreground hover:underline",
}

