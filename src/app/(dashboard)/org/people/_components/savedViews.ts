export type FilterKey =
  | "missingReporting"
  | "missingRole"
  | "missingTeam"
  | "managersOnly"
  | "needsAttention";

export type SavedView = {
  id: string;
  name: string;
  filters: FilterKey[];
  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;
  shared?: boolean;
};

const LS_KEY = "loopwell_org_people_saved_views_v1";

function safeParse(json: string | null): SavedView[] {
  if (!json) return [];

  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return data.filter(Boolean);
  } catch {
    return [];
  }
}

export function loadSavedViews(): SavedView[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(LS_KEY));
}

export function saveSavedViews(views: SavedView[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(views));
}

export function newSavedView(name: string, filters: Set<FilterKey>): SavedView {
  const now = Date.now();
  return {
    id: `sv_${now}_${Math.random().toString(16).slice(2)}`,
    name: name.trim() || "Untitled view",
    filters: Array.from(filters),
    createdAt: now,
    updatedAt: now,
  };
}

export function upsertSavedView(views: SavedView[], view: SavedView): SavedView[] {
  const idx = views.findIndex((v) => v.id === view.id);
  if (idx === -1) return [view, ...views];
  const next = [...views];
  next[idx] = { ...view, updatedAt: Date.now() };
  return next;
}

export function deleteSavedView(views: SavedView[], id: string): SavedView[] {
  const next = views.filter((v) => v.id !== id);
  // Ensure at most one default; if default deleted, clear defaults
  const hasDefault = next.some((v) => v.isDefault);
  if (!hasDefault) {
    return next.map((v) => ({ ...v, isDefault: false }));
  }
  return next;
}

export function setDefaultView(views: SavedView[], id: string): SavedView[] {
  return views.map((v) => ({ ...v, isDefault: v.id === id }));
}

export function getDefaultView(views: SavedView[]): SavedView | null {
  return views.find((v) => v.isDefault) || null;
}

