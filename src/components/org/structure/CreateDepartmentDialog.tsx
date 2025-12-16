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

type CreateDepartmentFormValues = {
  name: string;
  description?: string;
};

type CreateDepartmentDialogProps = {
  onCreateDepartment?: (values: CreateDepartmentFormValues) => Promise<void> | void;
};

export function CreateDepartmentDialog(props: CreateDepartmentDialogProps) {
  const { onCreateDepartment } = props;

  const router = useRouter();
  const { toast } = useToast();
  const perms = useOrgPermissions();

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<CreateDepartmentFormValues>({
    name: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setValues({
      name: "",
      description: "",
    });
    setError(null);
  }

  async function createDepartmentViaApi(payload: CreateDepartmentFormValues) {
    const res = await fetch("/api/org/departments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const message =
        data?.error?.message ||
        data?.error ||
        data?.message ||
        "Something went wrong while creating the department.";
      throw new Error(message);
    }

    return res.json();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!values.name.trim()) {
      setError("Department name is required.");
      return;
    }

    try {
      setSubmitting(true);

      const payload: CreateDepartmentFormValues = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
      };

      let createdDepartmentId: string | undefined;

      if (onCreateDepartment) {
        await onCreateDepartment(payload);
      } else {
        const result = await createDepartmentViaApi(payload);
        createdDepartmentId = result?.data?.id;
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
    } catch (err: any) {
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
        <DialogContent className="max-w-md border border-slate-800 bg-[#020617] text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-50">
            Create department
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Define a new department to group related teams (e.g. Engineering, Operations, CX).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-slate-300">
              Department name
            </label>
            <Input
              autoFocus
              value={values.name}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Customer Experience"
              className="h-8 rounded-md border-slate-700 bg-[#020617] text-[13px] text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-slate-300">
              Description
              <span className="ml-1 text-[11px] font-normal text-slate-500">
                (optional)
              </span>
            </label>
            <Textarea
              value={values.description ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Short description of what this department is responsible for."
              className="min-h-[72px] rounded-md border-slate-700 bg-[#020617] text-[13px] text-slate-100 placeholder:text-slate-500"
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
              className="text-[13px] text-slate-400 hover:text-slate-100"
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

