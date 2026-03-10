"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";

type EditDepartmentDialogProps = {
  department: {
    id: string;
    name: string;
    ownerPersonId: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditDepartmentDialog({
  department,
  open,
  onOpenChange,
}: EditDepartmentDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const peopleQ = useOrgQuery(() => OrgApi.listPeople(), []);
  // Support both { ok, data: { people } } and { people } response shapes
  const people = ((peopleQ.data as Record<string, unknown>)?.data as Record<string, unknown>)?.people as Array<{ id: string; fullName: string }> ?? (peopleQ.data as Record<string, unknown>)?.people as Array<{ id: string; fullName: string }> ?? [];

  const [name, setName] = useState(department.name);
  const [ownerPersonId, setOwnerPersonId] = useState<string>(department.ownerPersonId || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when department changes
  useEffect(() => {
    if (open && department) {
      setName(department.name);
      setOwnerPersonId(department.ownerPersonId || "");
      setError(null);
    }
  }, [open, department]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Department name is required.");
      return;
    }

    if (!ownerPersonId) {
      setError("Department owner is required.");
      return;
    }

    try {
      setSubmitting(true);

      // Update department name (if changed)
      if (name.trim() !== department.name) {
        const res = await fetch(`/api/org/departments/${department.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `Failed to update department (${res.status})`);
        }
      }

      // Update owner (if changed)
      if (ownerPersonId !== (department.ownerPersonId || "")) {
        await OrgApi.setDepartmentOwner(department.id, {
          ownerPersonId: ownerPersonId || null,
        });
      }

      toast({
        title: "✓ Success",
        description: `"${name.trim()}" was updated.`,
      });

      router.refresh();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error("[EditDepartmentDialog] Failed to update department:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while updating the department. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-border bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground">
            Edit department
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update department name and owner.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Department name
            </Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Customer Experience"
              className="h-8 rounded-md border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground"
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Owner <span className="text-red-400">*</span>
            </Label>
            <Select
              value={ownerPersonId}
              onValueChange={setOwnerPersonId}
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
              onClick={() => onOpenChange(false)}
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
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

