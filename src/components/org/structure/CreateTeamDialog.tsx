"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { OrgCapabilityGate } from "@/components/org/OrgCapabilityGate";
import { useOrgPermissions } from "@/components/org/OrgPermissionsContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type CreateTeamFormValues = {
  name: string;
  departmentId?: string;
  description?: string;
};

type CreateTeamDialogProps = {
  // Optional: preselected department (e.g. when coming from a filtered view)
  defaultDepartmentId?: string;

  // Optional: list of departments to choose from (id + name)
  departments?: { id: string; name: string }[];

  // Called when the form is submitted successfully.
  // This will be wired to a mutation later.
  onCreateTeam?: (values: CreateTeamFormValues) => Promise<void> | void;
};

export function CreateTeamDialog(props: CreateTeamDialogProps) {
  const { defaultDepartmentId, departments, onCreateTeam } = props;

  const router = useRouter();
  const { toast } = useToast();
  const perms = useOrgPermissions();

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<CreateTeamFormValues>({
    name: "",
    departmentId: defaultDepartmentId,
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setValues({
      name: "",
      departmentId: defaultDepartmentId,
      description: "",
    });
    setError(null);
  }

  async function createTeamViaApi(payload: CreateTeamFormValues) {
    const res = await fetch("/api/org/structure/teams/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Only throw error if response is not ok (200-299)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      // Extract error message from various possible formats
      const errorMessage = 
        data?.error?.message ||
        data?.error ||
        data?.hint ||
        data?.message ||
        `Failed to create team (${res.status})`;
      throw new Error(errorMessage);
    }

    // Success - parse and return
    const data = await res.json();
    // Handle both { data: { id: ... } } and { id: ... } formats
    return data?.data || data;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!values.name.trim()) {
      setError("Team name is required.");
      return;
    }

    // Department is required by the schema, but we allow it to be optional in the UI
    // Show a helpful error if no department is selected
    if (!values.departmentId) {
      if (!departments || departments.length === 0) {
        setError("Please create a department first, then create a team.");
        return;
      } else {
        setError("Please select a department for this team.");
        return;
      }
    }

    try {
      setSubmitting(true);

      const payload: CreateTeamFormValues = {
        name: values.name.trim(),
        departmentId: values.departmentId || undefined,
        description: values.description?.trim() || undefined,
      };

      let createdTeamId: string | undefined;

      if (onCreateTeam) {
        await onCreateTeam(payload);
      } else {
        const result = await createTeamViaApi(payload);
        // Handle both direct object and wrapped { data: { id } } formats
        createdTeamId = result?.id || result?.data?.id;
      }

      toast({
        title: "✓ Success",
        description: `"${payload.name}" was created.`,
      });

      // Navigate with created badge, then refresh
      if (createdTeamId) {
        router.push(`/org/structure?tab=teams&created=${createdTeamId}`);
      }
      router.refresh();

      setSubmitting(false);
      setOpen(false);
      resetForm();
    } catch (err: unknown) {
      console.error("[CreateTeamDialog] Failed to create team:", err);
      setSubmitting(false);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating the team. Please try again."
      );
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm();
    }
    setOpen(nextOpen);
  }

  return (
    <OrgCapabilityGate
      capability="org:team:create"
      permissions={perms}
      fallback={null}
    >
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            className="rounded-full bg-slate-100 px-4 py-1.5 text-[13px] font-medium text-slate-900 hover:bg-white"
          >
            New team
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md border border-border bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground">
            Create team
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Add a new team to your organization. A department is required to create a team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-muted-foreground">
              Team name
            </label>
            <Input
              autoFocus
              value={values.name}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Onboarding squad"
              className="h-8 rounded-md border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-muted-foreground">
              Department
              <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                (required)
              </span>
            </label>
            {departments && departments.length > 0 ? (
              <select
                value={values.departmentId ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    departmentId: e.target.value || undefined,
                  }))
                }
                className={cn(
                  "h-8 w-full rounded-md border border-border bg-background px-2 text-[13px] text-foreground",
                  "outline-none transition-colors duration-150",
                  "hover:border-slate-500 focus-visible:ring-2 focus-visible:ring-[#5CA9FF] focus-visible:ring-offset-0"
                )}
              >
                <option value="">No department</option>
                {departments.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    {dep.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-2 rounded-lg bg-card/30 border border-border/50 p-3">
                <div className="text-[11px] text-muted-foreground">
                  No departments yet. Create a department first before creating a team.
                </div>
                <Link
                  href="/org/structure?tab=departments"
                  className="inline-flex items-center text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                >
                  Create department
                </Link>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-muted-foreground">
              Description
              <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <Textarea
              value={values.description ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Short description of what this team is responsible for."
              className="min-h-[72px] rounded-md border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {error && (
            <div className="text-[11px] text-red-400">
              {error}
            </div>
          )}

          <DialogFooter className="mt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[13px] text-muted-foreground hover:text-foreground"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="rounded-full bg-slate-100 px-4 py-1.5 text-[13px] font-medium text-slate-900 hover:bg-white"
            >
              {submitting ? "Creating…" : "Create team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </Dialog>
    </OrgCapabilityGate>
  );
}

export function CreateTeamDialogInlineTrigger(props: CreateTeamDialogProps) {
  // Convenience component in case you want a simpler import name at call sites.
  return <CreateTeamDialog {...props} />;
}

