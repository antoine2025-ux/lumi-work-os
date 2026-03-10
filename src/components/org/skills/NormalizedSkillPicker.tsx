"use client";

/**
 * NormalizedSkillPicker
 * 
 * Search and select skills from the normalized Skill taxonomy.
 * Supports inline create with permission-gated behavior.
 * 
 * Returns { skillId, skillName, category } on selection.
 */

import * as React from "react";
import { OrgApi } from "../api";

export type SkillPickerValue = {
  skillId: string;
  skillName: string;
  category: string | null;
};

type NormalizedSkillPickerProps = {
  /** Currently selected skill (optional, for edit mode) */
  value?: SkillPickerValue | null;
  /** Callback when a skill is selected */
  onSelect: (skill: SkillPickerValue) => void;
  /** Whether the user has permission to create new skills */
  canCreate?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Disable the picker */
  disabled?: boolean;
  /** Auto-focus on mount */
  autoFocus?: boolean;
};

export function NormalizedSkillPicker({
  value,
  onSelect,
  canCreate = false,
  placeholder = "Search skills...",
  disabled = false,
  autoFocus = false,
}: NormalizedSkillPickerProps) {
  const [query, setQuery] = React.useState("");
  const [skills, setSkills] = React.useState<
    Array<{ id: string; name: string; category: string | null }>
  >([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Debounced search
  React.useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSkills([]);
      setError(null);
      return;
    }

    const timeout = setTimeout(() => {
      setIsLoading(true);
      setError(null);

      OrgApi.listSkills({ q: trimmed, limit: 10 })
        .then((res) => {
          if (res.ok) {
            setSkills(
              res.skills.map((s) => ({
                id: s.id,
                name: s.name,
                category: s.category,
              }))
            );
          } else {
            setSkills([]);
          }
        })
        .catch((err) => {
          console.error("[NormalizedSkillPicker] Search error:", err);
          setError("Failed to search skills");
          setSkills([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(skill: { id: string; name: string; category: string | null }) {
    onSelect({
      skillId: skill.id,
      skillName: skill.name,
      category: skill.category,
    });
    setQuery("");
    setIsOpen(false);
  }

  async function handleCreate() {
    const trimmed = query.trim();
    if (!trimmed || !canCreate || isCreating) return;

    setIsCreating(true);
    setError(null);

    try {
      const res = await OrgApi.createSkill({ name: trimmed });

      if (res.ok && res.skill) {
        // If skill already existed, message will indicate that
        onSelect({
          skillId: res.skill.id,
          skillName: res.skill.name,
          category: res.skill.category,
        });
        setQuery("");
        setIsOpen(false);
      }
    } catch (err) {
      console.error("[NormalizedSkillPicker] Create error:", err);
      setError("Failed to create skill");
    } finally {
      setIsCreating(false);
    }
  }

  const trimmedQuery = query.trim();
  const exactMatch = skills.find(
    (s) => s.name.toLowerCase() === trimmedQuery.toLowerCase()
  );
  const showCreateOption = canCreate && trimmedQuery && !exactMatch && !isLoading;

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (skills.length === 1) {
              handleSelect(skills[0]);
            } else if (exactMatch) {
              handleSelect(exactMatch);
            } else if (showCreateOption) {
              handleCreate();
            }
          }
          if (e.key === "Escape") {
            setIsOpen(false);
          }
        }}
        disabled={disabled}
        autoFocus={autoFocus}
      />

      {/* Dropdown */}
      {isOpen && (trimmedQuery || isLoading) && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-muted shadow-lg">
          {isLoading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
          )}

          {!isLoading && error && (
            <div className="px-3 py-2 text-sm text-red-400">{error}</div>
          )}

          {!isLoading && !error && skills.length === 0 && trimmedQuery && !showCreateOption && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No skills found</div>
          )}

          {!isLoading && skills.length > 0 && (
            <div className="max-h-48 overflow-y-auto py-1">
              {skills.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-foreground hover:bg-slate-700/50 transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(skill);
                  }}
                >
                  <span>{skill.name}</span>
                  {skill.category && (
                    <span className="ml-2 text-xs text-muted-foreground">{skill.category}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {showCreateOption && (
            <button
              type="button"
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm text-blue-400 hover:bg-slate-700/50 transition-colors disabled:opacity-50"
              onMouseDown={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              disabled={isCreating}
            >
              {isCreating ? (
                <>Creating...</>
              ) : (
                <>
                  <span className="text-lg leading-none">+</span>
                  <span>Create &quot;{trimmedQuery}&quot;</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Selected value display */}
      {value && (
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
            {value.skillName}
          </span>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-muted-foreground"
            onClick={() => {
              onSelect({ skillId: "", skillName: "", category: null });
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

