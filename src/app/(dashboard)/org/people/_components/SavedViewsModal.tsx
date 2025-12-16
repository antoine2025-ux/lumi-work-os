import React, { useEffect, useMemo, useState } from "react";
import type { FilterKey, SavedView } from "./savedViews";
import { useToast } from "./toast";

function ModalShell({
  open,
  title,
  subtitle,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <div
        className={[
          "fixed inset-0 z-40 transition",
          open ? "pointer-events-auto bg-black/25 opacity-100" : "pointer-events-none bg-transparent opacity-0",
        ].join(" ")}
        onClick={onClose}
        aria-hidden={!open}
      />
      <div
        className={[
          "fixed inset-0 z-50 flex items-center justify-center px-4 transition",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="w-full max-w-[720px] rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-black">
          <div className="border-b border-black/10 px-5 py-4 dark:border-white/10">
            <div className="text-lg font-semibold tracking-[-0.02em] text-black dark:text-white">
              {title}
            </div>
            {subtitle ? (
              <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                {subtitle}
              </div>
            ) : null}
          </div>
          <div className="px-5 py-4">{children}</div>
          <div className="flex items-center justify-between gap-3 border-t border-black/10 px-5 py-4 dark:border-white/10">
            <div className="text-xs text-black/50 dark:text-white/50">
              Saved views are persisted org-wide.
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3 py-2 text-sm font-medium text-black/70 hover:bg-black/5 hover:text-black focus:outline-none focus:ring-2 focus:ring-black/20 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-white/20"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Primary({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={!!disabled}
      onClick={onClick}
      className={[
        "rounded-xl px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2",
        disabled
          ? "bg-black/10 text-black/40 dark:bg-white/10 dark:text-white/40"
          : "bg-black text-white hover:bg-black/90 focus:ring-black/30 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/30",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function Ghost({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm font-medium text-black/70 hover:bg-black/5 hover:text-black focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-white/20"
    >
      {label}
    </button>
  );
}

function filtersLabel(filters: FilterKey[]) {
  if (filters.length === 0) return "No filters";
  // Keep labels stable and enterprise consistent
  const map: Record<FilterKey, string> = {
    needsAttention: "Needs attention",
    missingReporting: "Missing reporting line",
    missingRole: "Missing role",
    missingTeam: "Missing team",
    managersOnly: "Managers only",
  };
  return filters.map((f) => map[f]).join(" · ");
}

// Server model from API
type ServerSavedView = {
  id: string;
  orgId: string;
  userId: string | null;
  name: string;
  scope: string;
  state: {
    filters?: FilterKey[];
    isDefault?: boolean;
    sort?: string;
    query?: string;
    fixQueue?: boolean;
  };
  shared: boolean;
  createdAt: string;
  updatedAt: string;
};

// Convert server model to client model
function serverToClient(server: ServerSavedView): SavedView {
  return {
    id: server.id,
    name: server.name,
    filters: server.state.filters || [],
    createdAt: new Date(server.createdAt).getTime(),
    updatedAt: new Date(server.updatedAt).getTime(),
    isDefault: server.state.isDefault || false,
    shared: server.shared,
  };
}

// Convert client model to server payload
function clientToServerPayload(view: { name: string; filters: FilterKey[]; isDefault?: boolean; shared?: boolean }) {
  return {
    name: view.name,
    scope: "people",
    state: {
      filters: Array.from(view.filters),
      isDefault: view.isDefault || false,
    },
    shared: view.shared || false,
  };
}

export function SavedViewsModal({
  open,
  activeFilters,
  onApply,
  onClose,
}: {
  open: boolean;
  activeFilters: Set<FilterKey>;
  onApply: (filters: Set<FilterKey>) => void;
  onClose: () => void;
}) {
  const { push } = useToast();
  const [views, setViews] = useState<SavedView[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadViews();
    // Provide a default name if user has filters
    const hasFilters = activeFilters.size > 0;
    setName(hasFilters ? "Org issues" : "All people");
  }, [open, activeFilters]);

  async function loadViews() {
    setLoading(true);
    try {
      const res = await fetch("/api/org/views?scope=people");
      const data = await res.json();
      if (data?.ok && Array.isArray(data.views)) {
        setViews(data.views.map(serverToClient));
      }
    } catch (error) {
      push({ tone: "error", title: "Error", message: "Failed to load saved views." });
    } finally {
      setLoading(false);
    }
  }

  const defaultView = useMemo(() => views.find((v) => v.isDefault) || null, [views]);

  async function handleSaveNew() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const payload = clientToServerPayload({
        name: name.trim(),
        filters: Array.from(activeFilters),
        isDefault: false,
        shared: false,
      });
      const res = await fetch("/api/org/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.ok) {
        await loadViews();
        setName("");
        push({ tone: "success", title: "Saved", message: "View saved successfully." });
      } else {
        push({ tone: "error", title: "Error", message: data?.error || "Failed to save view." });
      }
    } catch (error) {
      push({ tone: "error", title: "Error", message: "Failed to save view." });
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(id: string) {
    const v = views.find((x) => x.id === id);
    if (!v) return;
    const nextName = window.prompt("Rename view:", v.name);
    if (!nextName || !nextName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/org/views/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName.trim() }),
      });
      const data = await res.json();
      if (data?.ok) {
        await loadViews();
        push({ tone: "success", title: "Renamed", message: "View renamed successfully." });
      } else {
        push({ tone: "error", title: "Error", message: data?.error || "Failed to rename view." });
      }
    } catch (error) {
      push({ tone: "error", title: "Error", message: "Failed to rename view." });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const v = views.find((x) => x.id === id);
    if (!v) return;
    const ok = window.confirm(`Delete saved view "${v.name}"?`);
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/org/views/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data?.ok) {
        await loadViews();
        push({ tone: "success", title: "Deleted", message: "View deleted successfully." });
      } else {
        push({ tone: "error", title: "Error", message: data?.error || "Failed to delete view." });
      }
    } catch (error) {
      push({ tone: "error", title: "Error", message: "Failed to delete view." });
    } finally {
      setLoading(false);
    }
  }

  async function handleSetDefault(id: string) {
    setLoading(true);
    try {
      // First, clear isDefault from all other views
      for (const v of views) {
        if (v.id !== id && v.isDefault) {
          await fetch(`/api/org/views/${v.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              state: {
                filters: v.filters,
                isDefault: false,
              },
            }),
          });
        }
      }
      // Then set the selected view as default
      const view = views.find((v) => v.id === id);
      if (!view) return;
      const res = await fetch(`/api/org/views/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: {
            filters: view.filters,
            isDefault: true,
          },
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        await loadViews();
        push({ tone: "success", title: "Updated", message: "Default view updated." });
      } else {
        push({ tone: "error", title: "Error", message: data?.error || "Failed to update default view." });
      }
    } catch (error) {
      push({ tone: "error", title: "Error", message: "Failed to update default view." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell
      open={open}
      title="Saved views"
      subtitle="Store and reuse filter configurations for fast enterprise workflows."
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Save current */}
        <div className="rounded-2xl border border-black/10 bg-black/5 p-4 dark:border-white/10 dark:bg-white/10">
          <div className="text-sm font-semibold text-black/90 dark:text-white/90">
            Save current filters
          </div>
          <div className="mt-1 text-sm text-black/60 dark:text-white/60">
            {activeFilters.size === 0 ? "Currently showing: All people" : "Currently showing: Filtered set"}
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="View name"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 shadow-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:focus:ring-white/20"
            />
            <Primary
              label="Save"
              onClick={handleSaveNew}
              disabled={name.trim().length === 0 || loading}
            />
          </div>
          <div className="mt-2 text-xs text-black/50 dark:text-white/50">
            Filters: {filtersLabel(Array.from(activeFilters))}
          </div>
        </div>

        {/* List */}
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-black/90 dark:text-white/90">
                Your views
              </div>
              <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                Default: {defaultView ? defaultView.name : "None"}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-3 text-sm text-black/60 dark:text-white/60">
              Loading...
            </div>
          ) : views.length === 0 ? (
            <div className="mt-3 text-sm text-black/60 dark:text-white/60">
              No saved views yet.
            </div>
          ) : (
            <div className="mt-3 divide-y divide-black/10 overflow-hidden rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
              {views.map((v) => (
                <div key={v.id} className="flex flex-col gap-2 bg-transparent p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold text-black/90 dark:text-white/90">
                        {v.name}
                      </div>
                      {v.isDefault ? (
                        <span className="rounded-full border border-black/10 bg-black/5 px-2 py-0.5 text-xs text-black/60 dark:border-white/10 dark:bg-white/10 dark:text-white/60">
                          Default
                        </span>
                      ) : null}
                      {v.shared ? (
                        <span className="rounded-full border border-black/10 bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:border-white/10 dark:bg-blue-900/30 dark:text-blue-300">
                          Shared
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                      {filtersLabel(v.filters)}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Primary label="Apply" onClick={() => onApply(new Set(v.filters))} />
                    <Ghost label="Rename" onClick={() => handleRename(v.id)} />
                    <Ghost label="Set default" onClick={() => handleSetDefault(v.id)} />
                    <Ghost label="Delete" onClick={() => handleDelete(v.id)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </ModalShell>
  );
}

