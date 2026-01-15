"use client";

/**
 * Edit Person Drawer
 * 
 * Calm, form-based editing of person details.
 * All fields optional. Clearing a field is allowed.
 * No warnings, no blocking saves.
 */

import React, { useState, useEffect } from "react";
import { AddAvailabilityDrawer } from "./AddAvailabilityDrawer";
import { AddAllocationDrawer } from "./AddAllocationDrawer";

type Person = {
  id: string;
  fullName?: string;
  name?: string;
  title?: string;
  role?: string;
  teamName?: string;
  team?: string;
  managerId?: string | null;
  managerName?: string | null;
  availability?: Array<{
    id: string;
    type: "UNAVAILABLE" | "PARTIAL";
    startDate: string;
    endDate?: string | null;
    fraction?: number | null;
    note?: string | null;
  }>;
  allocations?: Array<{
    id: string;
    projectId: string;
    projectName?: string;
    fraction: number;
    startDate: string;
    endDate?: string | null;
    note?: string | null;
  }>;
};

export function EditPersonDrawer({
  open,
  person,
  peopleOptions,
  teamOptions,
  onClose,
  onSave,
}: {
  open: boolean;
  person: Person | null;
  peopleOptions: { id: string; name: string }[];
  teamOptions: { id: string; name: string }[];
  onClose: () => void;
  onSave: (data: {
    id: string;
    name?: string;
    role?: string;
    teamId?: string;
    teamName?: string;
    managerId?: string | null;
  }) => Promise<void>;
  onAddAvailability?: (personId: string, window: {
    type: "UNAVAILABLE" | "PARTIAL";
    startDate: Date;
    endDate?: Date;
    fraction?: number;
    note?: string;
  }) => Promise<void>;
  onAddAllocation?: (personId: string, allocation: {
    projectId: string;
    fraction: number;
    startDate: Date;
    endDate?: Date;
    note?: string;
  }) => Promise<void>;
  projectOptions?: { id: string; name: string }[];
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [managerId, setManagerId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [saving, setSaving] = useState(false);
  const [addAvailabilityOpen, setAddAvailabilityOpen] = useState(false);
  const [addAllocationOpen, setAddAllocationOpen] = useState(false);

  useEffect(() => {
    if (person) {
      setName(person.fullName || person.name || "");
      setRole(person.title || person.role || "");
      setManagerId(person.managerId || "");
      const team = person.teamName || person.team;
      if (team) {
        const existingTeam = teamOptions.find((t) => t.name === team);
        if (existingTeam) {
          setTeamId(existingTeam.id);
        } else {
          setTeamName(team);
        }
      } else {
        setTeamId("");
        setTeamName("");
      }
    }
  }, [person, teamOptions]);

  if (!open || !person) return null;

  const handleClose = () => {
    setSaving(false);
    onClose();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        id: person.id,
        name: name.trim() || undefined,
        role: role.trim() || undefined,
        managerId: managerId || null,
        teamId: teamId || undefined,
        teamName: teamName.trim() || undefined,
      });
      handleClose();
    } catch (error) {
      console.error("Failed to save person:", error);
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
                Edit person
              </div>
              <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                Update details. All fields are optional.
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
            {/* Name */}
            <div>
              <label className="text-xs font-medium text-black/70 dark:text-white/70">
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:placeholder:text-white/30 dark:focus:ring-white/20"
                placeholder="Jane Doe"
              />
            </div>

            {/* Role */}
            <div>
              <label className="text-xs font-medium text-black/70 dark:text-white/70">
                Role
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:placeholder:text-white/30 dark:focus:ring-white/20"
                placeholder="e.g. Product Manager"
              />
            </div>

            {/* Manager */}
            <div>
              <label className="text-xs font-medium text-black/70 dark:text-white/70">
                Reports to
              </label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:focus:ring-white/20"
              >
                <option value="">Not set</option>
                {peopleOptions.filter((p) => p.id !== person.id).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Team */}
            <div>
              <label className="text-xs font-medium text-black/70 dark:text-white/70">
                Team
              </label>
              {teamOptions.length > 0 ? (
                <select
                  value={teamId}
                  onChange={(e) => {
                    setTeamId(e.target.value);
                    setTeamName("");
                  }}
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
                  onChange={(e) => {
                    setTeamName(e.target.value);
                    setTeamId("");
                  }}
                  className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:placeholder:text-white/30 dark:focus:ring-white/20"
                  placeholder="Enter team name"
                />
              )}
            </div>

            {/* Availability */}
            <div className="border-t border-black/10 pt-4 dark:border-white/10">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-xs font-medium text-black/70 dark:text-white/70">
                  Availability
                </label>
                {onAddAvailability && (
                  <button
                    type="button"
                    onClick={() => setAddAvailabilityOpen(true)}
                    className="text-xs text-black/50 underline hover:text-black/70 dark:text-white/50 dark:hover:text-white/70"
                  >
                    Add time off / partial availability
                  </button>
                )}
              </div>
              {person.availability && person.availability.length > 0 ? (
                <div className="space-y-2">
                  {person.availability.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg border border-black/10 bg-black/5 p-2 text-xs dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="font-medium">
                        {a.type === "UNAVAILABLE" ? "Unavailable" : `Partial (${Math.round((a.fraction ?? 0.5) * 100)}%)`}
                      </div>
                      <div className="mt-1 text-black/50 dark:text-white/50">
                        {new Date(a.startDate).toLocaleDateString()}
                        {a.endDate ? ` – ${new Date(a.endDate).toLocaleDateString()}` : " (ongoing)"}
                      </div>
                      {a.note && (
                        <div className="mt-1 text-black/40 dark:text-white/40">{a.note}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-black/40 dark:text-white/40">
                  No availability windows recorded.
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-xl border border-black/10 px-4 py-2 text-sm font-medium text-black/70 hover:bg-black/5 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:bg-black/10 disabled:text-black/40 dark:bg-white dark:text-black dark:disabled:bg-white/10 dark:disabled:text-white/40"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </aside>
      </div>
      {onAddAvailability && person && (
        <AddAvailabilityDrawer
          open={addAvailabilityOpen}
          onClose={() => setAddAvailabilityOpen(false)}
          onSave={async (window) => {
            await onAddAvailability(person.id, window);
            setAddAvailabilityOpen(false);
          }}
        />
      )}
      {onAddAllocation && person && projectOptions && (
        <AddAllocationDrawer
          open={addAllocationOpen}
          onClose={() => setAddAllocationOpen(false)}
          projects={projectOptions}
          onSave={async (allocation) => {
            await onAddAllocation(person.id, allocation);
            setAddAllocationOpen(false);
          }}
        />
      )}
    </>
  );
}

