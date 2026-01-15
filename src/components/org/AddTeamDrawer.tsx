"use client";

import * as React from "react";
import { createTeam } from "@/lib/org/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PersonOption = {
  id: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

type DepartmentOption = {
  id: string;
  name: string;
};

function displayName(p: PersonOption) {
  return (
    p.fullName ||
    [p.firstName, p.lastName].filter(Boolean).join(" ") ||
    p.email ||
    "Unnamed"
  );
}

export function AddTeamDrawer(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  people: PersonOption[];
  departments: DepartmentOption[];
  defaultDepartmentId?: string | null;
}) {
  const { open, onOpenChange, people, departments, defaultDepartmentId } = props;

  const [name, setName] = React.useState("");
  const [ownerId, setOwnerId] = React.useState<string>("none");
  const [departmentId, setDepartmentId] = React.useState<string>(
    defaultDepartmentId ?? "none"
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setOwnerId("none");
    setDepartmentId(defaultDepartmentId ?? "none");
    setError(null);
  }, [open, defaultDepartmentId]);

  async function onCreate() {
    setIsSaving(true);
    setError(null);

    const res = await createTeam({
      name,
      ownerId: ownerId && ownerId !== "none" ? ownerId : null,
      departmentId: departmentId && departmentId !== "none" ? departmentId : null,
    });

    if (!res.ok) {
      setIsSaving(false);
      setError(res.error ?? "Could not create team.");
      return;
    }

    setIsSaving(false);
    onOpenChange(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-background border-l border-border shadow-2xl flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="text-sm text-muted-foreground">Team</div>
          <div className="mt-1 text-xl font-semibold text-slate-100">Add team</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Create a team and optionally assign it to a department and owner.
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-100">Name</div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Backend"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-100">Department</div>
              <Select value={departmentId && departmentId !== "none" ? departmentId : "none"} onValueChange={setDepartmentId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Not yet placed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not yet placed</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                You can leave this blank and place the team later.
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-100">Owner</div>
              <Select value={ownerId && ownerId !== "none" ? ownerId : "none"} onValueChange={setOwnerId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {displayName(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="text-sm text-red-500">
                {error}
              </div>
            )}
          </Card>
        </div>

        <div className="p-6 border-t border-border bg-background">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={onCreate} disabled={isSaving}>
              {isSaving ? "Creating..." : "Create team"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

