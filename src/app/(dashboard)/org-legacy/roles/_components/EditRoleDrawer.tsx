"use client";

import React, { useState, useEffect } from "react";

export function EditRoleDrawer({
  open,
  onClose,
  role,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  role?: {
    id?: string;
    name: string;
    responsibilities: Array<{ id?: string; scope: string; target: string }>;
  };
  onSave: (next: { name: string; responsibilities: Array<{ scope: string; target: string }> }) => void;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [responsibilities, setResponsibilities] = useState<Array<{ id?: string; scope: string; target: string }>>(
    role?.responsibilities ?? []
  );

  useEffect(() => {
    if (open && role) {
      setName(role.name);
      setResponsibilities(role.responsibilities);
    } else if (open && !role) {
      setName("");
      setResponsibilities([]);
    }
  }, [open, role]);

  if (!open) return null;

  function addResponsibility(scope: string) {
    setResponsibilities([...responsibilities, { scope, target: "" }]);
  }

  function removeResponsibility(index: number) {
    setResponsibilities(responsibilities.filter((_, i) => i !== index));
  }

  function updateResponsibility(index: number, target: string) {
    const next = [...responsibilities];
    next[index] = { ...next[index], target };
    setResponsibilities(next);
  }

  const scopeGroups = ["OWNERSHIP", "DECISION", "EXECUTION"] as const;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white/80 p-6 backdrop-blur dark:bg-black/80">
        <div className="mb-4">
          <div className="text-sm font-semibold">{role ? "Edit role" : "Create role"}</div>
          <div className="text-xs text-black/50 dark:text-white/50">
            Define what this role owns, decides, and executes.
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs text-black/50 dark:text-white/50">Role name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Product Manager"
            className="w-full rounded-lg border px-2 py-1 text-sm"
          />
        </div>

        <div className="space-y-4">
          {scopeGroups.map((scope) => {
            const scopeResponsibilities = responsibilities.filter((r) => r.scope === scope);
            return (
              <div key={scope}>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium text-black/70 dark:text-white/70">{scope}</label>
                  <button
                    onClick={() => addResponsibility(scope)}
                    className="text-xs underline text-black/50 hover:text-black/70 dark:text-white/50 dark:hover:text-white/70"
                  >
                    Add {scope.toLowerCase()}
                  </button>
                </div>
                <div className="space-y-2">
                  {scopeResponsibilities.map((r, i) => {
                    const globalIndex = responsibilities.indexOf(r);
                    return (
                      <div key={globalIndex} className="flex gap-2">
                        <input
                          value={r.target}
                          onChange={(e) => updateResponsibility(globalIndex, e.target.value)}
                          placeholder="Describe responsibility"
                          className="flex-1 rounded-lg border px-2 py-1 text-xs"
                        />
                        <button
                          onClick={() => removeResponsibility(globalIndex)}
                          className="rounded-lg px-2 py-1 text-xs text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
              onSave({ name, responsibilities });
              onClose();
            }}
            className="rounded-lg bg-black px-3 py-2 text-xs text-white dark:bg-white dark:text-black"
            disabled={!name.trim()}
          >
            Save
          </button>
        </div>
      </aside>
    </div>
  );
}

