"use client";

/**
 * EditRoleCardSkillDialog
 * 
 * Dialog for adding a skill to a role card.
 * Uses NormalizedSkillPicker for skill selection.
 */

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NormalizedSkillPicker, SkillPickerValue } from "../skills/NormalizedSkillPicker";
import { OrgApi } from "../api";
import { Label } from "@/components/ui/label";

type EditRoleCardSkillDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  roleCardId: string;
  /** List of already-assigned skill IDs to prevent duplicates */
  existingSkillIds?: string[];
};

const TYPE_OPTIONS = [
  { value: "REQUIRED", label: "Required" },
  { value: "PREFERRED", label: "Preferred" },
];

const PROFICIENCY_OPTIONS = [
  { value: "", label: "No minimum" },
  { value: "1", label: "1 - Beginner" },
  { value: "2", label: "2 - Basic" },
  { value: "3", label: "3 - Intermediate" },
  { value: "4", label: "4 - Advanced" },
  { value: "5", label: "5 - Expert" },
];

export function EditRoleCardSkillDialog({
  open,
  onClose,
  onSaved,
  roleCardId,
  existingSkillIds = [],
}: EditRoleCardSkillDialogProps) {
  const [selectedSkill, setSelectedSkill] = React.useState<SkillPickerValue | null>(null);
  const [type, setType] = React.useState<"REQUIRED" | "PREFERRED">("REQUIRED");
  const [minProficiency, setMinProficiency] = React.useState<string>("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedSkill(null);
      setType("REQUIRED");
      setMinProficiency("");
      setError(null);
    }
  }, [open]);

  function handleSkillSelect(skill: SkillPickerValue) {
    if (!skill.skillId) {
      setSelectedSkill(null);
      return;
    }

    // Check for duplicate
    if (existingSkillIds.includes(skill.skillId)) {
      setError("This skill is already added to the role card");
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
      await OrgApi.addRoleCardSkill(roleCardId, {
        skillId: selectedSkill.skillId,
        type,
        minProficiency: minProficiency ? Number(minProficiency) : null,
      });

      onSaved();
    } catch (err: unknown) {
      console.error("[EditRoleCardSkillDialog] Save error:", err);
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Skill Requirement</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Skill picker */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Skill</Label>
            <NormalizedSkillPicker
              value={selectedSkill}
              onSelect={handleSkillSelect}
              canCreate={true}
              placeholder="Search or create skill..."
              autoFocus
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Requirement Type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "REQUIRED" | "PREFERRED")}
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Minimum Proficiency */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Minimum Proficiency</Label>
            <select
              value={minProficiency}
              onChange={(e) => setMinProficiency(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PROFICIENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Optional: Set a minimum proficiency level for this skill.
            </p>
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !selectedSkill?.skillId}
          >
            {isSaving ? "Adding..." : "Add"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

