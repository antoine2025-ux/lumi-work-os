"use client";

import * as React from "react";
import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";

type CreateDepartmentFormValues = {
  name: string;
  description?: string;
  ownerPersonId: string;
};

type CreateDepartmentDialogProps = {
  onCreateDepartment?: (values: CreateDepartmentFormValues) => Promise<void> | void;
};

export function CreateDepartmentDialog(props: CreateDepartmentDialogProps) {
  const { onCreateDepartment } = props;

  const router = useRouter();
  const { toast } = useToast();
  const perms = useOrgPermissions();
  const peopleQ = useOrgQuery(() => OrgApi.listPeople(), []);
  // Support both { ok, data: { people } } and { people } response shapes
  const people = ((peopleQ.data as Record<string, unknown>)?.data as Record<string, unknown>)?.people as Array<{ id: string; fullName: string }> ?? (peopleQ.data as Record<string, unknown>)?.people as Array<{ id: string; fullName: string }> ?? [];

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<CreateDepartmentFormValues>({
    name: "",
    description: "",
    ownerPersonId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setValues({
      name: "",
      description: "",
      ownerPersonId: "",
    });
    setError(null);
  }

  async function createDepartmentViaApi(payload: CreateDepartmentFormValues) {
    const res = await fetch("/api/org/structure/departments/create", {
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
        `Failed to create department (${res.status})`;
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
      setError("Department name is required.");
      return;
    }

    if (!values.ownerPersonId) {
      setError("Department owner is required.");
      return;
    }

    try {
      setSubmitting(true);

      const payload: CreateDepartmentFormValues = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        ownerPersonId: values.ownerPersonId,
      };

      let createdDepartmentId: string | undefined;

      if (onCreateDepartment) {
        await onCreateDepartment(payload);
      } else {
        const result = await createDepartmentViaApi(payload);
        // Handle both direct object and wrapped { data: { id } } formats
        createdDepartmentId = result?.id || result?.data?.id;
      }

      toast({
        title: "✓ Success",
        description: `"${payload.name}" was created.`,
      });

      // Navigate with created badge, then refresh
      if (createdDepartmentId) {
        router.push(`/org/structure?tab=departments&created=${createdDepartmentId}`);
      }
      router.refresh();

      setSubmitting(false);
      setOpen(false);
      resetForm();
    } catch (err: unknown) {
      console.error("[CreateDepartmentDialog] Failed to create department:", err);
      setSubmitting(false);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating the department. Please try again."
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
      capability="org:department:create"
      permissions={perms}
      fallback={null}
    >
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            className="rounded-full bg-slate-100 px-4 py-1.5 text-[13px] font-medium text-slate-900 hover:bg-white"
          >
            New department
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md border border-border bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground">
            Create department
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Define a new department to group related teams (e.g. Engineering, Operations, CX).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-muted-foreground">
              Department name
            </label>
            <Input
              autoFocus
              value={values.name}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Customer Experience"
              className="h-8 rounded-md border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground"
            />
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
              placeholder="Short description of what this department is responsible for."
              className="min-h-[72px] rounded-md border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Owner <span className="text-red-400">*</span>
            </Label>
            <Select
              value={values.ownerPersonId}
              onValueChange={(value) =>
                setValues((prev) => ({ ...prev, ownerPersonId: value }))
              }
              disabled={submitting || people.length === 0}
            >
              <SelectTrigger className="h-8 rounded-md border-border bg-background text-[13px] text-foreground">
                <SelectValue placeholder="Select owner…" />
              </SelectTrigger>
              <SelectContent>
                {people.map((p: { id: string; fullName: string }) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {people.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                No people available. Create people first.
              </p>
            )}
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
              {submitting ? "Creating…" : "Create department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </OrgCapabilityGate>
  );
}

export function CreateDepartmentDialogInlineTrigger(
  props: CreateDepartmentDialogProps
) {
  return <CreateDepartmentDialog {...props} />;
}

