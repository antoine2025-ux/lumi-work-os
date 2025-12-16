"use client";

import React, { useState } from "react";

export function UtilitiesDrawer({
  orgSnapshot,
  recentChanges,
  capacityView,
}: {
  orgSnapshot: React.ReactNode;
  recentChanges: React.ReactNode;
  capacityView?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Utilities toggle */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 rounded-xl border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-black/70 shadow-sm backdrop-blur hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/20"
      >
        Utilities
      </button>

      {/* Drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 pointer-events-none">
          {/* Subtle scrim (non-modal) */}
          <div
            className="absolute inset-0 bg-black/5 dark:bg-black/10 pointer-events-auto"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <aside className="pointer-events-auto absolute right-0 top-0 h-full w-full max-w-[360px] border-l border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
            <header className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-black/90 dark:text-white/90">
                  Utilities
                </div>
                <div className="text-xs text-black/50 dark:text-white/50">
                  Contextual org reference
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-xs text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
              >
                Close
              </button>
            </header>

            <div className="space-y-6">
              {/* Org snapshot */}
              <section>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
                  Org snapshot
                </div>
                <div className="space-y-1 text-sm text-black/70 dark:text-white/70">
                  {orgSnapshot}
                </div>
              </section>

              {/* Recent changes */}
              <section>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
                  Recent changes
                </div>
                <div className="text-sm text-black/60 dark:text-white/60">
                  {recentChanges}
                </div>
              </section>

              {/* Capacity view */}
              {capacityView && (
                <section>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
                    Capacity
                  </div>
                  <div className="text-sm text-black/60 dark:text-white/60">
                    {capacityView}
                  </div>
                </section>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
