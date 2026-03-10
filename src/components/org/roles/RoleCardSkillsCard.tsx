"use client";

/**
 * RoleCardSkillsCard
 * 
 * Displays and manages skills for a role card.
 * Shows Required and Preferred sections with add/remove actions.
 * 
 * Facts only - no coverage indicators or gap analysis.
 */

import * as React from "react";
import { OrgApi } from "../api";
import { EditRoleCardSkillDialog } from "./EditRoleCardSkillDialog";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

type RoleCardSkill = {
  id: string;
  skillId: string;
  skill: { id: string; name: string; category: string | null };
  type: "REQUIRED" | "PREFERRED";
  minProficiency: number | null;
};

type RoleCardSkillsCardProps = {
  roleCardId: string;
  canEdit?: boolean;
};

function SkillItem({
  skill,
  canEdit,
  onRemove,
  isDeleting,
}: {
  skill: RoleCardSkill;
  canEdit: boolean;
  onRemove: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 group">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-foreground truncate">{skill.skill.name}</span>
        {skill.skill.category && (
          <span className="text-xs text-muted-foreground">{skill.skill.category}</span>
        )}
        {skill.minProficiency && (
          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
            Min: {skill.minProficiency}
          </span>
        )}
      </div>

      {canEdit && (
        <button
          type="button"
          className="p-1 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
          disabled={isDeleting}
          title="Remove"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function RoleCardSkillsCard({ roleCardId, canEdit = false }: RoleCardSkillsCardProps) {
  const [skills, setSkills] = React.useState<RoleCardSkill[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const fetchSkills = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await OrgApi.getRoleCardSkills(roleCardId);
      if (res.ok) {
        setSkills(res.skills);
      } else {
        setError("Failed to load skills");
      }
    } catch (err) {
      console.error("[RoleCardSkillsCard] Error:", err);
      setError("Failed to load skills");
    } finally {
      setIsLoading(false);
    }
  }, [roleCardId]);

  React.useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  async function handleRemove(roleCardSkillId: string) {
    if (deletingId) return;
    setDeletingId(roleCardSkillId);

    try {
      await OrgApi.removeRoleCardSkill(roleCardId, roleCardSkillId);
      setSkills((prev) => prev.filter((s) => s.id !== roleCardSkillId));
    } catch (err) {
      console.error("[RoleCardSkillsCard] Remove error:", err);
    } finally {
      setDeletingId(null);
    }
  }

  function handleSaved() {
    fetchSkills();
    setDialogOpen(false);
  }

  const requiredSkills = skills.filter((s) => s.type === "REQUIRED");
  const preferredSkills = skills.filter((s) => s.type === "PREFERRED");
  const existingSkillIds = skills.map((s) => s.skillId);

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Skills</h3>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDialogOpen(true)}
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
          No skills defined
        </div>
      )}

      {!isLoading && !error && skills.length > 0 && (
        <div className="space-y-4">
          {/* Required Skills */}
          {requiredSkills.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Required
              </h4>
              <div className="space-y-1">
                {requiredSkills.map((skill) => (
                  <SkillItem
                    key={skill.id}
                    skill={skill}
                    canEdit={canEdit}
                    onRemove={() => handleRemove(skill.id)}
                    isDeleting={deletingId === skill.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Preferred Skills */}
          {preferredSkills.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Preferred
              </h4>
              <div className="space-y-1">
                {preferredSkills.map((skill) => (
                  <SkillItem
                    key={skill.id}
                    skill={skill}
                    canEdit={canEdit}
                    onRemove={() => handleRemove(skill.id)}
                    isDeleting={deletingId === skill.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <EditRoleCardSkillDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
        roleCardId={roleCardId}
        existingSkillIds={existingSkillIds}
      />
    </div>
  );
}

