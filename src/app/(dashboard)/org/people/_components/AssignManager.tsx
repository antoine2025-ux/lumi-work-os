"use client";

/**
 * Assign Manager Component
 * 
 * Single-purpose manager assignment.
 * Dropdown of existing people. Allows unset.
 * Saves immediately. No AI, no validation beyond existence.
 */

import React, { useState } from "react";

type Person = {
  id: string;
  fullName?: string;
  name?: string;
  managerId?: string | null;
  managerName?: string | null;
};

export function AssignManager({
  person,
  peopleOptions,
  onSave,
  onCancel,
}: {
  person: Person;
  peopleOptions: { id: string; name: string }[];
  onSave: (managerId: string | null, managerName: string | null) => Promise<void>;
  onCancel?: () => void;
}) {
  const [managerId, setManagerId] = useState(person.managerId || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const manager = managerId
        ? peopleOptions.find((p) => p.id === managerId)
        : null;
      await onSave(managerId || null, manager?.name || null);
    } catch (error) {
      console.error("Failed to assign manager:", error);
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-black/70 dark:text-white/70">
          Reports to
        </label>
        <select
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
          disabled={saving}
          className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 focus:outline-none focus:ring-2 focus:ring-black/20 disabled:bg-black/5 disabled:text-black/40 dark:border-white/10 dark:bg-black dark:text-white/80 dark:focus:ring-white/20 dark:disabled:bg-white/5 dark:disabled:text-white/40"
        >
          <option value="">Unset manager</option>
          {peopleOptions.filter((p) => p.id !== person.id).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm font-medium text-black/70 hover:bg-black/5 disabled:bg-black/5 disabled:text-black/40 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:disabled:bg-white/5 dark:disabled:text-white/40"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-xl bg-black px-3 py-2 text-sm font-medium text-white disabled:bg-black/10 disabled:text-black/40 dark:bg-white dark:text-black dark:disabled:bg-white/10 dark:disabled:text-white/40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

