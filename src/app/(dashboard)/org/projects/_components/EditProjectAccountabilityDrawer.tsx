"use client";

import React, { useState, useEffect } from "react";

type Mode = "person" | "role";

export function EditProjectAccountabilityDrawer({
  open,
  onClose,
  value,
  people,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  value?: {
    ownerPersonId?: string;
    ownerRole?: string;
    decisionPersonId?: string;
    decisionRole?: string;
    escalationPersonId?: string;
    escalationRole?: string;
    backupOwnerPersonId?: string;
    backupOwnerRole?: string;
    backupDecisionPersonId?: string;
    backupDecisionRole?: string;
  };
  people: { id: string; name: string }[];
  onSave: (next: any) => void;
}) {
  const [state, setState] = useState(value ?? {});

  // Reset state when drawer opens/closes or value changes
  useEffect(() => {
    if (open) {
      setState(value ?? {});
    }
  }, [open, value]);

  if (!open) return null;

  function renderField(label: string, personKey: string, roleKey: string) {
    const currentMode: Mode = state[personKey] ? "person" : state[roleKey] ? "role" : "person";

    return (
      <div className="space-y-2">
        <div className="text-xs text-black/50 dark:text-white/50">{label}</div>

        <div className="flex gap-2">
          <select
            value={currentMode}
            onChange={(e) => {
              const newMode = e.target.value as Mode;
              // Clear the opposite field when switching modes
              if (newMode === "person") {
                setState({
                  ...state,
                  [roleKey]: undefined,
                });
              } else {
                setState({
                  ...state,
                  [personKey]: undefined,
                });
              }
            }}
            className="rounded-lg border px-2 py-1 text-xs"
          >
            <option value="person">Person</option>
            <option value="role">Role</option>
          </select>

          {currentMode === "person" ? (
            <select
              value={state[personKey] ?? ""}
              onChange={(e) =>
                setState({ ...state, [personKey]: e.target.value || undefined })
              }
              className="flex-1 rounded-lg border px-2 py-1 text-xs"
            >
              <option value="">Not set</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={state[roleKey] ?? ""}
              onChange={(e) =>
                setState({ ...state, [roleKey]: e.target.value || undefined })
              }
              placeholder="e.g. Product Manager"
              className="flex-1 rounded-lg border px-2 py-1 text-xs"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white/80 p-6 backdrop-blur dark:bg-black/80">
        <div className="mb-4">
          <div className="text-sm font-semibold">Edit accountability</div>
          <div className="text-xs text-black/50 dark:text-white/50">
            Define who owns, decides, and escalates for this project.
          </div>
        </div>

        <div className="space-y-4">
          {renderField("Owner", "ownerPersonId", "ownerRole")}
          {renderField("Decision authority", "decisionPersonId", "decisionRole")}
          {renderField("Escalation", "escalationPersonId", "escalationRole")}
          
          <div className="border-t border-black/10 pt-4 dark:border-white/10">
            <div className="mb-2 text-xs font-medium text-black/70 dark:text-white/70">Coverage (optional)</div>
            {renderField("Backup owner", "backupOwnerPersonId", "backupOwnerRole")}
            {renderField("Backup decision authority", "backupDecisionPersonId", "backupDecisionRole")}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xs text-black/50 dark:text-white/50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(state);
              onClose();
            }}
            className="rounded-lg bg-black px-3 py-2 text-xs text-white dark:bg-white dark:text-black"
          >
            Save
          </button>
        </div>
      </aside>
    </div>
  );
}

