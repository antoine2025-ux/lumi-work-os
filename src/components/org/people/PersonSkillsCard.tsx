"use client";

/**
 * PersonSkillsCard
 * 
 * Displays a person's skills with proficiency levels.
 * Supports add/edit/remove actions.
 * 
 * Facts only - no gap analysis or recommendations.
 */

import * as React from "react";
import { OrgApi } from "../api";
import { EditPersonSkillDialog } from "./EditPersonSkillDialog";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";

type PersonSkill = {
  id: string;
  skillId: string;
  skill: { id: string; name: string; category: string | null };
  proficiency: number;
  source: string;
  verifiedAt: string | null;
};

type PersonSkillsCardProps = {
  personId: string;
  canEdit?: boolean;
};

const PROFICIENCY_LABELS = ["", "Beginner", "Basic", "Intermediate", "Advanced", "Expert"];

function ProficiencyBadge({ level }: { level: number }) {
  const label = PROFICIENCY_LABELS[level] || `Level ${level}`;
  const colors: Record<number, string> = {
    1: "bg-slate-600/30 text-muted-foreground",
    2: "bg-slate-500/30 text-muted-foreground",
    3: "bg-blue-500/20 text-blue-400",
    4: "bg-emerald-500/20 text-emerald-400",
    5: "bg-amber-500/20 text-amber-400",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${colors[level] || colors[3]}`}>
      {label}
    </span>
  );
}

function SourceBadge({ source, verified }: { source: string; verified: boolean }) {
  if (verified) {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Verified
      </span>
    );
  }

  const labels: Record<string, string> = {
    SELF_REPORTED: "Self-reported",
    MANAGER_ADDED: "Manager added",
    INFERRED: "Inferred",
  };

  return (
    <span className="text-xs text-muted-foreground">
      {labels[source] || source}
    </span>
  );
}

export function PersonSkillsCard({ personId, canEdit = false }: PersonSkillsCardProps) {
  const [skills, setSkills] = React.useState<PersonSkill[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingSkill, setEditingSkill] = React.useState<PersonSkill | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const fetchSkills = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await OrgApi.getPersonSkills(personId);
      if (res.ok) {
        // Sort by proficiency desc, then name asc
        const sorted = [...res.skills].sort((a, b) => {
          if (b.proficiency !== a.proficiency) {
            return b.proficiency - a.proficiency;
          }
          return a.skill.name.localeCompare(b.skill.name);
        });
        setSkills(sorted);
      } else {
        setError("Failed to load skills");
      }
    } catch (err: unknown) {
      console.error("[PersonSkillsCard] Error:", err);
      setError("Failed to load skills");
    } finally {
      setIsLoading(false);
    }
  }, [personId]);

  React.useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  async function handleDelete(personSkillId: string) {
    if (deletingId) return;
    setDeletingId(personSkillId);

    try {
      await OrgApi.removePersonSkill(personId, personSkillId);
      setSkills((prev) => prev.filter((s) => s.id !== personSkillId));
    } catch (err: unknown) {
      console.error("[PersonSkillsCard] Delete error:", err);
    } finally {
      setDeletingId(null);
    }
  }

  function handleOpenAdd() {
    setEditingSkill(null);
    setDialogOpen(true);
  }

  function handleOpenEdit(skill: PersonSkill) {
    setEditingSkill(skill);
    setDialogOpen(true);
  }

  function handleDialogClose() {
    setDialogOpen(false);
    setEditingSkill(null);
  }

  function handleSaved() {
    fetchSkills();
    handleDialogClose();
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Skills</h3>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenAdd}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add skill
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>
      )}

      {error && (
        <div className="py-4 text-center text-sm text-red-400">{error}</div>
      )}

      {!isLoading && !error && skills.length === 0 && (
        <div className="py-4 text-center text-sm text-muted-foreground">
          No skills recorded
        </div>
      )}

      {!isLoading && !error && skills.length > 0 && (
        <div className="space-y-2">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground truncate">
                      {skill.skill.name}
                    </span>
                    {skill.skill.category && (
                      <span className="text-xs text-muted-foreground">
                        {skill.skill.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <ProficiencyBadge level={skill.proficiency} />
                    <SourceBadge
                      source={skill.source}
                      verified={!!skill.verifiedAt}
                    />
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    className="p-1 text-muted-foreground hover:text-foreground"
                    onClick={() => handleOpenEdit(skill)}
                    title="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="p-1 text-muted-foreground hover:text-red-400"
                    onClick={() => handleDelete(skill.id)}
                    disabled={deletingId === skill.id}
                    title="Remove"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <EditPersonSkillDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSaved={handleSaved}
        personId={personId}
        existingSkill={editingSkill}
        existingSkillIds={skills.map((s) => s.skillId)}
      />
    </div>
  );
}

