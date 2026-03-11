"use client";

/**
 * Create Work Request Drawer
 * 
 * Form for creating new work requests.
 * Phase H: Minimal form for work intake.
 * Phase K: Added work tags selector for alignment.
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Tag, X } from "lucide-react";

type ResponsibilityTag = {
  id: string;
  key: string;
  label: string;
  category: string | null;
};

type CreateWorkRequestDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function CreateWorkRequestDrawer({
  open,
  onOpenChange,
  onSuccess,
}: CreateWorkRequestDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("P2");
  const [desiredStart, setDesiredStart] = useState("");
  const [desiredEnd, setDesiredEnd] = useState("");
  const [effortType, setEffortType] = useState("TSHIRT");
  const [effortHours, setEffortHours] = useState("");
  const [effortTShirt, setEffortTShirt] = useState("M");
  const [domainType, setDomainType] = useState("OTHER");
  const [requiredRoleType, setRequiredRoleType] = useState("");
  const [requiredSeniority, setRequiredSeniority] = useState("");
  
  // Phase K: Work tags
  const [availableTags, setAvailableTags] = useState<ResponsibilityTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Fetch available tags
  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/org/responsibility/tags");
      const data = await res.json();
      if (data.ok) {
        setAvailableTags(data.tags.filter((t: ResponsibilityTag & { isArchived: boolean }) => !t.isArchived));
      }
    } catch (error: unknown) {
      console.error("Failed to fetch tags:", error);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTags();
    }
  }, [open, fetchTags]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("P2");
    setDesiredStart("");
    setDesiredEnd("");
    setEffortType("TSHIRT");
    setEffortHours("");
    setEffortTShirt("M");
    setDomainType("OTHER");
    setRequiredRoleType("");
    setRequiredSeniority("");
    setSelectedTagIds([]);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        desiredStart: new Date(desiredStart).toISOString(),
        desiredEnd: new Date(desiredEnd).toISOString(),
        effortType,
        domainType,
      };

      if (effortType === "HOURS") {
        body.effortHours = parseFloat(effortHours);
      } else {
        body.effortTShirt = effortTShirt;
      }

      if (requiredRoleType.trim()) {
        body.requiredRoleType = requiredRoleType.trim();
      }

      if (requiredSeniority) {
        body.requiredSeniority = requiredSeniority;
      }

      // Phase K: Include selected work tags
      if (selectedTagIds.length > 0) {
        body.workTagIds = selectedTagIds;
      }

      const response = await fetch("/api/org/work/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to create work request");
      }

      resetForm();
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create Work Request</SheetTitle>
          <SheetDescription>
            Define work to be staffed. LoopBrain will analyze capacity and recommend assignees.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Implement user authentication"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the work..."
              rows={3}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority *</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="P0">P0 - Critical</SelectItem>
                <SelectItem value="P1">P1 - High</SelectItem>
                <SelectItem value="P2">P2 - Medium</SelectItem>
                <SelectItem value="P3">P3 - Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time Window */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="desiredStart">Desired Start *</Label>
              <Input
                id="desiredStart"
                type="date"
                value={desiredStart}
                onChange={(e) => setDesiredStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desiredEnd">Desired End *</Label>
              <Input
                id="desiredEnd"
                type="date"
                value={desiredEnd}
                onChange={(e) => setDesiredEnd(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Effort Estimate */}
          <div className="space-y-2">
            <Label>Effort Estimate *</Label>
            <div className="flex gap-2">
              <Select value={effortType} onValueChange={setEffortType}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TSHIRT">T-Shirt</SelectItem>
                  <SelectItem value="HOURS">Hours</SelectItem>
                </SelectContent>
              </Select>

              {effortType === "TSHIRT" ? (
                <Select value={effortTShirt} onValueChange={setEffortTShirt}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XS">XS (~4h)</SelectItem>
                    <SelectItem value="S">S (~8h)</SelectItem>
                    <SelectItem value="M">M (~16h)</SelectItem>
                    <SelectItem value="L">L (~32h)</SelectItem>
                    <SelectItem value="XL">XL (~64h)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={effortHours}
                  onChange={(e) => setEffortHours(e.target.value)}
                  placeholder="Hours"
                  className="flex-1"
                  required
                />
              )}
            </div>
          </div>

          {/* Domain Type */}
          <div className="space-y-2">
            <Label>Domain *</Label>
            <Select value={domainType} onValueChange={setDomainType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEAM">Team</SelectItem>
                <SelectItem value="DEPARTMENT">Department</SelectItem>
                <SelectItem value="ROLE">Role</SelectItem>
                <SelectItem value="FUNCTION">Function</SelectItem>
                <SelectItem value="OTHER">Other / Workspace-wide</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Required Role */}
          <div className="space-y-2">
            <Label htmlFor="requiredRoleType">Required Role (optional)</Label>
            <Input
              id="requiredRoleType"
              value={requiredRoleType}
              onChange={(e) => setRequiredRoleType(e.target.value)}
              placeholder="e.g., Engineer, PM, Designer"
            />
          </div>

          {/* Required Seniority */}
          <div className="space-y-2">
            <Label>Required Seniority (optional)</Label>
            <Select value={requiredSeniority} onValueChange={setRequiredSeniority}>
              <SelectTrigger>
                <SelectValue placeholder="Any level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any level</SelectItem>
                <SelectItem value="JUNIOR">Junior</SelectItem>
                <SelectItem value="MID">Mid</SelectItem>
                <SelectItem value="SENIOR">Senior</SelectItem>
                <SelectItem value="LEAD">Lead</SelectItem>
                <SelectItem value="PRINCIPAL">Principal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Phase K: Work Tags */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <Label>Work Tags (optional)</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Tags describe the type of work for alignment checking.
            </p>
            {availableTags.length > 0 ? (
              <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[60px]">
                {availableTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTagIds(selectedTagIds.filter((id) => id !== tag.id));
                        } else {
                          setSelectedTagIds([...selectedTagIds, tag.id]);
                        }
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {tag.label}
                      {isSelected && <X className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No tags configured. Tags can be managed in Settings.
              </p>
            )}
            {selectedTagIds.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedTagIds.map((id) => {
                  const tag = availableTags.find((t) => t.id === id);
                  return tag ? (
                    <Badge key={id} variant="secondary" className="text-xs">
                      {tag.label}
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Request
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
