"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PeopleFilters } from "./people-filters";

export type SavedView = {
  id: string;
  name: string;
  filters: PeopleFilters;
  createdAt: number;
  urlParams?: string; // Optional URL params for presets that need mode/focus/etc
};

const STORAGE_KEY = "people-saved-views";

const DEFAULT_VIEWS: SavedView[] = [
  {
    id: "org-issues",
    name: "Org issues",
    filters: { quickChip: "all" },
    createdAt: 0,
    urlParams: "mode=fix&focus=ownership",
  },
  {
    id: "leadership-structure",
    name: "Leadership structure",
    filters: { quickChip: "leaders", sort: "name", direction: "desc" },
    createdAt: 0,
    urlParams: "mode=explore&leadersOnly=true&sort=name&direction=desc",
  },
  {
    id: "capacity-review",
    name: "Capacity review",
    filters: { quickChip: "all" },
    createdAt: 0,
    urlParams: "mode=explore&availability=available",
  },
  {
    id: "all",
    name: "All people",
    filters: { quickChip: "all" },
    createdAt: 0,
  },
  {
    id: "leaders",
    name: "Leaders",
    filters: { quickChip: "leaders" },
    createdAt: 0,
  },
  {
    id: "unassigned",
    name: "Unassigned",
    filters: { quickChip: "unassigned" },
    createdAt: 0,
  },
];

function loadSavedViews(): SavedView[] {
  if (typeof window === "undefined") return DEFAULT_VIEWS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_VIEWS;
    const userViews = JSON.parse(stored) as SavedView[];
    return [...DEFAULT_VIEWS, ...userViews];
  } catch {
    return DEFAULT_VIEWS;
  }
}

function saveUserViews(views: SavedView[]): void {
  if (typeof window === "undefined") return;
  try {
    const userViews = views.filter((v) => !DEFAULT_VIEWS.find((d) => d.id === v.id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userViews));
  } catch {
    // Ignore storage errors
  }
}

type SavedViewsDropdownProps = {
  currentFilters: PeopleFilters;
  onViewSelect: (filters: PeopleFilters) => void;
  onViewSelectWithURL?: (urlParams: string) => void; // For presets that need URL params
};

/**
 * Saved views dropdown for People page
 * Default views + user-created views from local storage
 * Save, rename, delete functionality
 */
export function SavedViewsDropdown({
  currentFilters,
  onViewSelect,
  onViewSelectWithURL,
}: SavedViewsDropdownProps) {
  const router = useRouter();
  const [views, setViews] = useState<SavedView[]>(DEFAULT_VIEWS);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [editingView, setEditingView] = useState<SavedView | null>(null);
  const [viewName, setViewName] = useState("");

  useEffect(() => {
    setViews(loadSavedViews());
  }, []);

  const handleSaveView = useCallback(() => {
    if (!viewName.trim()) return;

    const newView: SavedView = {
      id: `view-${Date.now()}`,
      name: viewName.trim(),
      filters: { ...currentFilters },
      createdAt: Date.now(),
    };

    const updatedViews = [...views, newView];
    setViews(updatedViews);
    saveUserViews(updatedViews);
    setIsSaveDialogOpen(false);
    setViewName("");
    setIsOpen(false);
  }, [viewName, currentFilters, views]);

  const handleRenameView = useCallback(() => {
    if (!editingView || !viewName.trim()) return;

    const updatedViews = views.map((v) =>
      v.id === editingView.id ? { ...v, name: viewName.trim() } : v
    );
    setViews(updatedViews);
    saveUserViews(updatedViews);
    setIsRenameDialogOpen(false);
    setEditingView(null);
    setViewName("");
  }, [editingView, viewName, views]);

  const handleDeleteView = useCallback(
    (viewId: string) => {
      if (DEFAULT_VIEWS.find((v) => v.id === viewId)) return; // Can't delete default views

      const updatedViews = views.filter((v) => v.id !== viewId);
      setViews(updatedViews);
      saveUserViews(updatedViews);
    },
    [views]
  );

  const handleViewSelect = useCallback(
    (view: SavedView) => {
      if (view.urlParams) {
        // Use URL params for presets - navigate directly
        router.push(`/org/directory?${view.urlParams}`, { scroll: false });
      } else if (onViewSelectWithURL) {
        // Fallback to callback if provided
        onViewSelectWithURL(view.urlParams || "");
      } else {
        // Use filters for regular views
        onViewSelect(view.filters);
      }
      setIsOpen(false);
    },
    [onViewSelect, onViewSelectWithURL, router]
  );

  const currentView = views.find((v) => {
    // Simple matching - could be improved
    return JSON.stringify(v.filters) === JSON.stringify(currentFilters);
  });

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "inline-flex items-center gap-2",
            "rounded-full",
            "px-4 py-1.5",
            "text-sm",
            "bg-slate-900/40",
            "text-foreground/60",
            "hover:bg-slate-900/60",
            "hover:text-foreground/80",
            "transition-colors",
            "border border-slate-800/70"
          )}
        >
          <span>{currentView?.name || "Views"}</span>
          <ChevronDown className="h-4 w-4" />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute left-0 top-full mt-2 z-50 w-64 rounded-lg border border-slate-800/70 bg-slate-900 shadow-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                {views.map((view) => (
                  <div
                    key={view.id}
                    className={cn(
                      "flex items-center justify-between px-4 py-2 hover:bg-slate-800/50 transition-colors",
                      currentView?.id === view.id && "bg-slate-800/30"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleViewSelect(view)}
                      className="flex-1 text-left text-sm text-slate-200"
                    >
                      {view.name}
                    </button>
                    {!DEFAULT_VIEWS.find((v) => v.id === view.id) && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingView(view);
                            setViewName(view.name);
                            setIsRenameDialogOpen(true);
                            setIsOpen(false);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-200"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteView(view.id);
                          }}
                          className="p-1 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <div className="border-t border-slate-800/70">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSaveDialogOpen(true);
                      setViewName("");
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/50 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Save current view…</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Save dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Save View</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="View name"
              className="bg-slate-800 border-slate-700 text-slate-100"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveView();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsSaveDialogOpen(false);
                setViewName("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveView} disabled={!viewName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Rename View</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="View name"
              className="bg-slate-800 border-slate-700 text-slate-100"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRenameView();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsRenameDialogOpen(false);
                setEditingView(null);
                setViewName("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameView} disabled={!viewName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

