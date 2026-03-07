"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { orgTokens } from "@/components/org/ui/tokens";

type PersonSkill = {
  id: string;
  skillId: string;
  name: string;
  category: string | null;
  proficiency: number;
  source: string;
  verifiedAt: string | null;
};

type SkillSuggestion = {
  id: string;
  name: string;
  category: string | null;
};

interface SkillsEditorProps {
  personUserId: string;
  initialSkills: PersonSkill[];
  onSkillsChanged?: () => void;
}

export function SkillsEditor({ personUserId, initialSkills, onSkillsChanged }: SkillsEditorProps) {
  const [skills, setSkills] = useState<PersonSkill[]>(initialSkills);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<SkillSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch autocomplete suggestions
  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const controller = new AbortController();
    fetch(`/api/org/skills?q=${encodeURIComponent(trimmed)}&limit=8`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setSuggestions(data.skills ?? []);
          setShowDropdown(true);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [inputValue]);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function addSkill(name: string, existingSkillId?: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (skills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue("");
      setShowDropdown(false);
      return;
    }

    setSaving(true);
    try {
      let skillId = existingSkillId;

      // If not from suggestion, create/find in taxonomy first
      if (!skillId) {
        const createRes = await fetch("/api/org/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        if (!createRes.ok) return;
        const createData = await createRes.json();
        skillId = createData.skill?.id;
      }

      if (!skillId) return;

      // Add to person
      const addRes = await fetch(`/api/org/people/${personUserId}/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId, source: "SELF_REPORTED" }),
      });
      if (!addRes.ok) return;
      const addData = await addRes.json();

      if (addData.ok && addData.personSkill) {
        const ps = addData.personSkill;
        setSkills((prev) => [
          ...prev,
          {
            id: ps.id,
            skillId: ps.skillId,
            name: ps.skill.name,
            category: ps.skill.category,
            proficiency: ps.proficiency,
            source: ps.source,
            verifiedAt: ps.verifiedAt,
          },
        ]);
        onSkillsChanged?.();
      }
    } finally {
      setSaving(false);
      setInputValue("");
      setShowDropdown(false);
      inputRef.current?.focus();
    }
  }

  async function removeSkill(personSkillId: string) {
    setRemovingId(personSkillId);
    try {
      const res = await fetch(
        `/api/org/people/${personUserId}/skills/${personSkillId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setSkills((prev) => prev.filter((s) => s.id !== personSkillId));
        onSkillsChanged?.();
      }
    } finally {
      setRemovingId(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) {
        const s = suggestions[0];
        addSkill(s.name, s.id);
      } else if (inputValue.trim()) {
        addSkill(inputValue.trim());
      }
    }
    if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Existing skills */}
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {skills.length > 0 ? (
          skills.map((s) => (
            <Badge
              key={s.id}
              variant="outline"
              className={cn(
                "border-slate-600 text-muted-foreground text-xs flex items-center gap-1 pr-1",
                removingId === s.id && "opacity-50"
              )}
            >
              {s.name}
              {s.proficiency >= 4 && <span className="text-amber-400">★</span>}
              <button
                type="button"
                onClick={() => removeSkill(s.id)}
                disabled={removingId === s.id}
                className="ml-0.5 rounded-full hover:bg-slate-700 p-0.5 transition-colors"
                aria-label={`Remove ${s.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No skills added yet — type below to add one</p>
        )}
      </div>

      {/* Input */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue.trim() && setShowDropdown(true)}
            placeholder="Add a skill (e.g. Python, SQL, Facilitation)…"
            className={cn(
              orgTokens.input,
              "bg-background border-border text-foreground placeholder-slate-600 flex-1"
            )}
            disabled={saving}
          />
          <button
            type="button"
            onClick={() => addSkill(inputValue)}
            disabled={saving || !inputValue.trim()}
            className={cn(
              orgTokens.button,
              "bg-background border-border text-muted-foreground hover:bg-[#1e293b] flex items-center gap-1 shrink-0",
              (!inputValue.trim() || saving) && "opacity-50 cursor-not-allowed"
            )}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add
          </button>
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-20 top-full mt-1 w-full max-w-sm rounded-xl border border-border bg-card shadow-lg overflow-hidden"
          >
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-[#1e293b] flex items-center justify-between"
                onClick={() => addSkill(s.name, s.id)}
              >
                <span>{s.name}</span>
                {s.category && (
                  <span className="text-xs text-muted-foreground">{s.category}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-600">
        Press Enter or click Add. Skills are visible to your team and used by Loopbrain for candidate matching.
      </p>
    </div>
  );
}
