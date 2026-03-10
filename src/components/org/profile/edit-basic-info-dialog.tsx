"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface EditBasicInfoDialogProps {
  positionId: string;
  initialName: string;
  initialTitle: string;
  email?: string | null;
  /** Controlled mode: external control of open state */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, do not render the trigger button (for use with ProfileEditButton) */
  hideTrigger?: boolean;
}

export function EditBasicInfoDialog({
  positionId,
  initialName,
  initialTitle,
  email,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: EditBasicInfoDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (v: boolean) => onOpenChange?.(v)
    : setInternalOpen;

  useEffect(() => {
    if (open) {
      setFormData({ name: initialName, title: initialTitle });
    }
  }, [open, initialName, initialTitle]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: initialName,
    title: initialTitle,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const name = formData.name.trim();
      const title = formData.title.trim();
      if (!name) throw new Error("Name is required");
      if (!title) throw new Error("Role / title is required");

      const [nameRes, titleRes] = await Promise.all([
        fetch(`/api/org/people/${positionId}/name`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name }),
        }),
        fetch(`/api/org/people/${positionId}/title`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title }),
        }),
      ]);

      const firstError =
        (!nameRes.ok && (await nameRes.json().catch(() => ({})))) ||
        (!titleRes.ok && (await titleRes.json().catch(() => ({}))));

      if (firstError) {
        throw new Error(
          typeof firstError.error === "string"
            ? firstError.error
            : "Failed to update profile"
        );
      }

      toast({ title: "Profile updated", description: "Your name and title have been saved." });
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" className="border-slate-600 text-muted-foreground">
            Edit Profile
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Jane Doe"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Role / title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="e.g. Product Designer"
              required
              disabled={loading}
            />
          </div>

          {email && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Email</Label>
              <Input value={email} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed here. Contact your workspace admin.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
