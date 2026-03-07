"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updateDepartment } from "@/lib/org/actions";
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
import { DeleteDepartmentInline } from "@/components/org/structure/DeleteDepartmentInline";

type PersonOption = {
  id: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

function displayName(p: PersonOption) {
  return (
    p.fullName ||
    [p.firstName, p.lastName].filter(Boolean).join(" ") ||
    p.email ||
    "Unnamed"
  );
}

export function EditDepartmentDrawer(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => Promise<void> | void;
  department: {
    id: string;
    name: string;
    ownerId?: string | null;
    teamCount?: number;
  };
  people: PersonOption[];
}) {
  const router = useRouter();
  const { open, onOpenChange, department, people, onSaved } = props;
  
  const teamCount = department.teamCount ?? 0;

  const [name, setName] = React.useState(department.name);
  const [ownerId, setOwnerId] = React.useState<string>(department.ownerId ?? "none");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(department.name);
    setOwnerId(department.ownerId ?? "none");
    setError(null);
  }, [open, department.id, department.name, department.ownerId]);

  async function onSave() {
    setIsSaving(true);
    setError(null);

    const res = await updateDepartment({
      departmentId: department.id,
      name,
      ownerPersonId: ownerId && ownerId !== "none" ? ownerId : null,
    });

    if (!res.ok) {
      setIsSaving(false);
      setError(res.error ?? "Could not save changes. Please try again.");
      return;
    }

    setIsSaving(false);
    if (onSaved) {
      await onSaved();
    }
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
          <div className="text-sm text-muted-foreground">Department</div>
          <div className="mt-1 text-xl font-semibold text-foreground">Edit department</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Keep changes minimal and deliberate — structure edits affect reporting and ownership.
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Name</div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Engineering"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Owner</div>
              <Select value={ownerId || "none"} onValueChange={setOwnerId}>
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
              <div className="text-xs text-muted-foreground">
                The department owner is accountable for resourcing and structure health.
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-500">{error}</div>
            )}
          </Card>

          {/* --- Danger zone --- */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="text-sm font-medium text-foreground">Danger zone</div>
            <div className="mt-1 text-sm text-foreground/60">
              Deleting a department is permanent. Teams must be moved or deleted first.
            </div>

            {teamCount > 0 ? (
              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-foreground/70">
                This department has {teamCount} team{teamCount === 1 ? "" : "s"}. Move or delete teams first.
                <div className="mt-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      onOpenChange(false);
                      router.push(`/org/structure/departments/${department.id}`);
                    }}
                  >
                    Manage teams
                  </Button>
                </div>
              </div>
            ) : (
              <DeleteDepartmentInline
                departmentId={department.id}
                departmentName={department.name}
                onDeleted={() => {
                  onOpenChange(false);
                  router.push("/org/structure?deleted=1");
                  router.refresh();
                }}
              />
            )}
          </div>
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
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

