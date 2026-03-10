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

type CreateRoleFormValues = {
  name: string;
  level?: string;
  description?: string;
};

type CreateRoleDialogProps = {
  onCreateRole?: (values: CreateRoleFormValues) => Promise<void> | void;
};

export function CreateRoleDialog(props: CreateRoleDialogProps) {
  const { onCreateRole } = props;

  const router = useRouter();
  const { toast } = useToast();
  const perms = useOrgPermissions();

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<CreateRoleFormValues>({
    name: "",
    level: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setValues({
      name: "",
      level: "",
      description: "",
    });
    setError(null);
  }

  async function createRoleViaApi(payload: CreateRoleFormValues) {
    const res = await fetch("/api/org/roles", {
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
        "Something went wrong while creating the role.";
      throw new Error(message);
    }

    return res.json();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!values.name.trim()) {
      setError("Role name is required.");
      return;
    }

    try {
      setSubmitting(true);

      const payload: CreateRoleFormValues = {
        name: values.name.trim(),
        level: values.level?.trim() || undefined,
        description: values.description?.trim() || undefined,
      };

      let createdRoleId: string | undefined;

      if (onCreateRole) {
        await onCreateRole(payload);
      } else {
        const result = await createRoleViaApi(payload);
        createdRoleId = result?.data?.id;
      }

      toast({
        title: "✓ Success",
        description: `"${payload.name}" was created.`,
      });

      // Navigate with created badge, then refresh
      if (createdRoleId) {
        router.push(`/org/structure?tab=roles&created=${createdRoleId}`);
      }
      router.refresh();

      setSubmitting(false);
      setOpen(false);
      resetForm();
    } catch (err: unknown) {
      console.error("[CreateRoleDialog] Failed to create role:", err);
      setSubmitting(false);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating the role. Please try again."
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
      capability="org:role:create"
      permissions={perms}
      fallback={null}
    >
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            className="rounded-full bg-slate-100 px-4 py-1.5 text-[13px] font-medium text-slate-900 hover:bg-white"
          >
            New role
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md border border-border bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground">
            Create role
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Define a role so expectations and responsibilities are clear for people in this org.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-muted-foreground">
              Role name
            </label>
            <Input
              autoFocus
              value={values.name}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Product Manager"
              className="h-8 rounded-md border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-muted-foreground">
              Level
              <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <Input
              value={values.level ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, level: e.target.value }))
              }
              placeholder="e.g. Senior, L3"
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
                setValues((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Short description of responsibilities or expectations for this role."
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
              {submitting ? "Creating…" : "Create role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </OrgCapabilityGate>
  );
}

export function CreateRoleDialogInlineTrigger(props: CreateRoleDialogProps) {
  return <CreateRoleDialog {...props} />;
}

