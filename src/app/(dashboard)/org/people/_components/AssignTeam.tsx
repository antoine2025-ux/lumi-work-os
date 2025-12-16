"use client";

/**
 * Assign Team Component
 * 
 * Single-purpose team assignment.
 * Select existing team or use free-text input.
 * Allows unset. Persists immediately.
 * Org v1 does not require Team entity purity.
 */

import React, { useState, useEffect } from "react";

type Person = {
  id: string;
  teamName?: string;
  team?: string;
};

export function AssignTeam({
  person,
  teamOptions,
  onSave,
  onCancel,
}: {
  person: Person;
  teamOptions: { id: string; name: string }[];
  onSave: (teamId: string | undefined, teamName: string | undefined) => Promise<void>;
  onCancel?: () => void;
}) {
  const [teamId, setTeamId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [useFreeText, setUseFreeText] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const existingTeam = person.teamName || person.team;
    if (existingTeam) {
      const team = teamOptions.find((t) => t.name === existingTeam);
      if (team) {
        setTeamId(team.id);
        setUseFreeText(false);
      } else {
        setTeamName(existingTeam);
        setUseFreeText(true);
      }
    }
  }, [person, teamOptions]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (useFreeText) {
        await onSave(undefined, teamName.trim() || undefined);
      } else {
        await onSave(teamId || undefined, undefined);
      }
    } catch (error) {
      console.error("Failed to assign team:", error);
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {teamOptions.length > 0 && !useFreeText ? (
        <div>
          <label className="text-xs font-medium text-black/70 dark:text-white/70">
            Team
          </label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            disabled={saving}
            className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 focus:outline-none focus:ring-2 focus:ring-black/20 disabled:bg-black/5 disabled:text-black/40 dark:border-white/10 dark:bg-black dark:text-white/80 dark:focus:ring-white/20 dark:disabled:bg-white/5 dark:disabled:text-white/40"
          >
            <option value="">Unset team</option>
            {teamOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setUseFreeText(true);
              setTeamId("");
            }}
            className="mt-1 text-xs text-black/50 underline hover:text-black/70 dark:text-white/50 dark:hover:text-white/70"
          >
            Or enter team name
          </button>
        </div>
      ) : (
        <div>
          <label className="text-xs font-medium text-black/70 dark:text-white/70">
            Team name
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            disabled={saving}
            className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/20 disabled:bg-black/5 disabled:text-black/40 dark:border-white/10 dark:bg-black dark:text-white/80 dark:placeholder:text-white/30 dark:focus:ring-white/20 dark:disabled:bg-white/5 dark:disabled:text-white/40"
            placeholder="Enter team name"
          />
          {teamOptions.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setUseFreeText(false);
                setTeamName("");
              }}
              className="mt-1 text-xs text-black/50 underline hover:text-black/70 dark:text-white/50 dark:hover:text-white/70"
            >
              Or select existing team
            </button>
          )}
        </div>
      )}

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

