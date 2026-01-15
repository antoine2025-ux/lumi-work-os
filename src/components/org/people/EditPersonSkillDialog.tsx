"use client";

/**
 * EditPersonSkillDialog
 * 
 * Dialog for adding or editing a person's skill.
 * Uses NormalizedSkillPicker for skill selection.
 */

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NormalizedSkillPicker, SkillPickerValue } from "../skills/NormalizedSkillPicker";
import { OrgApi } from "../api";
import { Label } from "@/components/ui/label";

type PersonSkill = {
  id: string;
  skillId: string;
  skill: { id: string; name: string; category: string | null };
  proficiency: number;
  source: string;
  verifiedAt: string | null;
};

type EditPersonSkillDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  personId: string;
  /** If provided, we're editing an existing skill */
  existingSkill?: PersonSkill | null;
  /** List of already-assigned skill IDs to prevent duplicates */
  existingSkillIds?: string[];
};

const PROFICIENCY_OPTIONS = [
  { value: 1, label: "1 - Beginner" },
  { value: 2, label: "2 - Basic" },
  { value: 3, label: "3 - Intermediate" },
  { value: 4, label: "4 - Advanced" },
  { value: 5, label: "5 - Expert" },
];

const SOURCE_OPTIONS = [
  { value: "SELF_REPORTED", label: "Self-reported" },
  { value: "MANAGER_ADDED", label: "Manager added" },
  { value: "VERIFIED", label: "Verified" },
  { value: "INFERRED", label: "Inferred" },
];

export function EditPersonSkillDialog({
  open,
  onClose,
  onSaved,
  personId,
  existingSkill,
  existingSkillIds = [],
}: EditPersonSkillDialogProps) {
  const isEdit = !!existingSkill;

  const [selectedSkill, setSelectedSkill] = React.useState<SkillPickerValue | null>(null);
  const [proficiency, setProficiency] = React.useState(3);
  const [source, setSource] = React.useState<string>("SELF_REPORTED");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Initialize form when dialog opens or existingSkill changes
  React.useEffect(() => {
    if (open) {
      if (existingSkill) {
        setSelectedSkill({
          skillId: existingSkill.skillId,
          skillName: existingSkill.skill.name,
          category: existingSkill.skill.category,
        });
        setProficiency(existingSkill.proficiency);
        setSource(existingSkill.source);
      } else {
        setSelectedSkill(null);
        setProficiency(3);
        setSource("SELF_REPORTED");
      }
      setError(null);
    }
  }, [open, existingSkill]);

  function handleSkillSelect(skill: SkillPickerValue) {
    if (!skill.skillId) {
      setSelectedSkill(null);
      return;
    }

    // Check for duplicate (only for new skills)
    if (!isEdit && existingSkillIds.includes(skill.skillId)) {
      setError("This skill is already assigned");
      return;
    }

    setSelectedSkill(skill);
    setError(null);
  }

  async function handleSave() {
    if (!selectedSkill?.skillId) {
      setError("Please select a skill");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (isEdit && existingSkill) {
        // Update existing
        await OrgApi.updatePersonSkill(personId, existingSkill.id, {
          proficiency,
          source: source as "SELF_REPORTED" | "MANAGER_ADDED" | "VERIFIED" | "INFERRED",
        });
      } else {
        // Add new
        await OrgApi.addPersonSkill(personId, {
          skillId: selectedSkill.skillId,
          proficiency,
          source: source as "SELF_REPORTED" | "MANAGER_ADDED" | "VERIFIED" | "INFERRED",
        });
      }

      onSaved();
    } catch (err) {
      console.error("[EditPersonSkillDialog] Save error:", err);
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            {isEdit ? "Edit Skill" : "Add Skill"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Skill picker - only shown for new skills */}
          {!isEdit && (
            <div className="space-y-2">
              <Label className="text-slate-300">Skill</Label>
              <NormalizedSkillPicker
                value={selectedSkill}
                onSelect={handleSkillSelect}
                canCreate={true}
                placeholder="Search or create skill..."
                autoFocus
              />
            </div>
          )}

          {/* Show selected skill for edit mode */}
          {isEdit && selectedSkill && (
            <div className="space-y-2">
              <Label className="text-slate-300">Skill</Label>
              <div className="rounded-lg bg-slate-800/50 px-3 py-2 text-sm text-slate-100">
                {selectedSkill.skillName}
                {selectedSkill.category && (
                  <span className="ml-2 text-xs text-slate-500">
                    {selectedSkill.category}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Proficiency */}
          <div className="space-y-2">
            <Label className="text-slate-300">Proficiency</Label>
            <select
              value={proficiency}
              onChange={(e) => setProficiency(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PROFICIENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label className="text-slate-300">Source</Label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="text-sm text-red-400">{error}</div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || (!isEdit && !selectedSkill?.skillId)}
          >
            {isSaving ? "Saving..." : isEdit ? "Save" : "Add"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

