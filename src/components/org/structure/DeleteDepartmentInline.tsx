"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DeleteDepartmentInline({
  departmentId,
  departmentName,
  onDeleted,
}: {
  departmentId: string;
  departmentName: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onConfirm() {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/org/structure/departments/${departmentId}`, {
        method: "DELETE",
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.ok) {
        const errorMsg = data.hint || data.error || "Delete failed";
        throw new Error(errorMsg);
      }
      
      setOpen(false);
      onDeleted?.();
      router.push("/org/structure?deleted=1");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not delete department.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="mt-4 flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 p-4">
        <div>
          <div className="text-sm font-medium text-red-200">Delete department</div>
          <div className="mt-1 text-sm text-red-200/70">
            Permanently removes <span className="font-medium">{departmentName}</span>.
          </div>
        </div>

        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete department?</DialogTitle>
            <DialogDescription>
              This action can't be undone. Delete{" "}
              <span className="font-medium">{departmentName}</span>?
            </DialogDescription>
          </DialogHeader>

          {error ? <div className="text-sm text-red-500">{error}</div> : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
              {isDeleting ? "Deleting…" : "Delete department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

