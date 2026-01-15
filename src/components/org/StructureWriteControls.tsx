/**
 * Structure Write Controls Component
 * 
 * Provides UI for creating departments and teams.
 * Feature-flagged via org.structure.write flag.
 */

"use client";

import { useState, useEffect } from "react";
import { OrgApi } from "@/components/org/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function StructureWriteControls({
  departments,
  onSuccess,
}: {
  departments: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}) {
  const [deptOpen, setDeptOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [teamName, setTeamName] = useState("");
  // Default to first department if only one exists
  const [teamDeptId, setTeamDeptId] = useState<string | null>(
    departments.length === 1 ? departments[0].id : null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update teamDeptId when departments change (if only one exists, default to it)
  useEffect(() => {
    if (departments.length === 1 && !teamDeptId) {
      setTeamDeptId(departments[0].id);
    } else if (departments.length === 0) {
      setTeamDeptId(null);
    }
  }, [departments, teamDeptId]);

  async function createDept() {
    setError(null);
    if (!deptName.trim()) {
      setError("Department name is required.");
      return;
    }
    setSaving(true);
    try {
      // Call API - this will throw if there's an error
      const result = await OrgApi.createDepartment({ name: deptName.trim() });
      
      // Success - clear form and close dialog
      setDeptName("");
      setError(null);
      setDeptOpen(false);
      
      // Trigger refetch
      onSuccess?.();
    } catch (e: any) {
      // Extract hint from API error response (api.ts already extracts it)
      const errorMessage = e?.message || "Failed to create department.";
      setError(errorMessage);
      // Keep dialog open so user can fix and retry
    } finally {
      setSaving(false);
    }
  }

  async function createTeam() {
    setError(null);
    if (!teamName.trim()) {
      setError("Team name is required.");
      return;
    }
    setSaving(true);
    try {
      // Call API - this will throw if there's an error
      const result = await OrgApi.createTeam({ name: teamName.trim(), departmentId: teamDeptId });
      
      // Success - clear form and close dialog
      setTeamName("");
      setTeamDeptId(null);
      setError(null);
      setTeamOpen(false);
      
      // Trigger refetch
      onSuccess?.();
    } catch (e: any) {
      // Extract hint from API error response (api.ts already extracts it)
      const errorMessage = e?.message || "Failed to create team.";
      setError(errorMessage);
      // Keep dialog open so user can fix and retry
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Dialog 
        open={deptOpen} 
        onOpenChange={(open) => {
          setDeptOpen(open);
          if (!open) {
            setError(null);
            setDeptName("");
          }
        }}
      >
        <DialogTrigger asChild>
          <Button size="sm">Add department</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create department</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createDept();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="dept-name">Name</Label>
              <Input
                id="dept-name"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                disabled={saving}
                placeholder="e.g., Engineering"
                autoFocus
              />
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeptOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !deptName.trim()}>
                {saving ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={teamOpen} 
        onOpenChange={(open) => {
          setTeamOpen(open);
          if (!open) {
            setError(null);
            setTeamName("");
            // Reset to first department if only one exists
            setTeamDeptId(departments.length === 1 ? departments[0].id : null);
          }
        }}
      >
        <DialogTrigger asChild>
          <Button size="sm" variant={departments.length === 0 ? "secondary" : "default"}>
            Add team
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create team</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTeam();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="team-name">Name</Label>
              <Input
                id="team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                disabled={saving}
                placeholder="e.g., Platform"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Department (optional)</Label>
              <Select
                value={teamDeptId || "__none__"}
                onValueChange={(v) => setTeamDeptId(v === "__none__" ? null : v)}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No department</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                {departments.length === 0
                  ? 'Teams can be created without a department. A default "Unassigned" department will be created if needed.'
                  : departments.length === 1
                  ? `Defaulting to "${departments[0].name}". You can change this or select "No department".`
                  : "Select a department or leave as 'No department'."}
              </div>
            </div>

            {error && <div className="text-sm text-destructive">{error}</div>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setTeamOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !teamName.trim()}>
                {saving ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

