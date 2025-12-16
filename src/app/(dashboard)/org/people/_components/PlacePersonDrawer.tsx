"use client";

/**
 * Place Person in Org Drawer
 * 
 * This is NOT "Add person" - it's "Place person in org".
 * Name is required. Everything else is optional.
 * Incomplete data is valid Org state.
 */

import React, { useState } from "react";

export function PlacePersonDrawer({
  open,
  onClose,
  onCreate,
  peopleOptions,
  teamOptions,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; role?: string; managerId?: string; teamId?: string; teamName?: string }) => Promise<void>;
  peopleOptions: { id: string; name: string }[];
  teamOptions: { id: string; name: string }[];
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [managerId, setManagerId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    setName("");
    setRole("");
    setManagerId("");
    setTeamId("");
    setTeamName("");
    setSaving(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onCreate({
        name: name.trim(),
        role: role.trim() || undefined,
        managerId: managerId || undefined,
        teamId: teamId || undefined,
        teamName: teamName.trim() || undefined,
      });
      handleClose();
    } catch (error) {
      console.error("Failed to create person:", error);
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div
          className="absolute inset-0 bg-black/30 pointer-events-auto"
          onClick={handleClose}
        />
        <aside className="pointer-events-auto absolute right-0 top-0 h-full w-full max-w-md border-l border-black/10 bg-white/80 p-6 backdrop-blur dark:border-white/10 dark:bg-black/80">
          <header className="mb-6 flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-black/90 dark:text-white/90">
                Place person in org
              </div>
              <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                Name is required. Missing details can be completed later.
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg px-2 py-1 text-xs text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
            >
              Close
            </button>
          </header>

          <div className="space-y-4">
            {/* Name - required */}
            <div>
              <label className="text-xs font-medium text-black/70 dark:text-white/70">
                Full name <span className="text-black/40 dark:text-white/40">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:placeholder:text-white/30 dark:focus:ring-white/20"
                placeholder="Jane Doe"
                autoFocus
              />
            </div>

            {/* Role - optional */}
            <div>
              <label className="text-xs font-medium text-black/70 dark:text-white/70">
                Role <span className="text-black/40 dark:text-white/40">(optional)</span>
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:placeholder:text-white/30 dark:focus:ring-white/20"
                placeholder="e.g. Product Manager"
              />
            </div>

            {/* Manager - optional */}
            <div>
              <label className="text-xs font-medium text-black/70 dark:text-white/70">
                Reports to <span className="text-black/40 dark:text-white/40">(optional)</span>
              </label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:focus:ring-white/20"
              >
                <option value="">Not set</option>
                {peopleOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Team - optional */}
            <div>
              <label className="text-xs font-medium text-black/70 dark:text-white/70">
                Team <span className="text-black/40 dark:text-white/40">(optional)</span>
              </label>
              {teamOptions.length > 0 ? (
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:focus:ring-white/20"
                >
                  <option value="">Not set</option>
                  {teamOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:placeholder:text-white/30 dark:focus:ring-white/20"
                  placeholder="Enter team name"
                />
              )}
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!name.trim() || saving}
                className="w-full rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:bg-black/10 disabled:text-black/40 dark:bg-white dark:text-black dark:disabled:bg-white/10 dark:disabled:text-white/40"
              >
                {saving ? "Saving…" : "Place in org"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

