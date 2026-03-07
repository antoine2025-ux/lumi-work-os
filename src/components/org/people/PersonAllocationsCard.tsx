/**
 * Person Allocations Card
 * 
 * Displays work allocations for a person.
 * Shows current commitments and total allocation percentage.
 * 
 * Phase G: Work allocation display and management.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Briefcase, Loader2, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type WorkAllocation = {
  id: string;
  personId: string;
  allocationPercent: number;
  contextType: "TEAM" | "PROJECT" | "ROLE" | "OTHER";
  contextId: string | null;
  contextLabel: string | null;
  startDate: string;
  endDate: string | null;
  source: "MANUAL" | "INTEGRATION";
  createdAt: string;
};

type PersonAllocationsCardProps = {
  personId: string;
  canEdit?: boolean;
  onAllocationsChanged?: () => void;
};

async function fetchAllocations(personId: string): Promise<WorkAllocation[]> {
  const res = await fetch(`/api/org/allocations?personId=${personId}`);
  if (!res.ok) throw new Error("Failed to fetch allocations");
  const data = await res.json();
  return data.allocations ?? [];
}

async function createAllocation(data: {
  personId: string;
  allocationPercent: number;
  contextType: string;
  contextLabel: string;
  startDate: string;
  endDate?: string | null;
}): Promise<WorkAllocation> {
  const res = await fetch("/api/org/allocations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create allocation");
  }
  const result = await res.json();
  return result.allocation;
}

async function deleteAllocation(allocationId: string): Promise<void> {
  const res = await fetch(`/api/org/allocations/${allocationId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete allocation");
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString();
}

function getContextTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    TEAM: "Team",
    PROJECT: "Project",
    ROLE: "Role",
    OTHER: "Other",
  };
  return labels[type] || type;
}

export function PersonAllocationsCard({ personId, canEdit = false, onAllocationsChanged }: PersonAllocationsCardProps) {
  const { toast } = useToast();
  const [allocations, setAllocations] = useState<WorkAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formPercent, setFormPercent] = useState("50");
  const [formContextType, setFormContextType] = useState<string>("PROJECT");
  const [formContextLabel, setFormContextLabel] = useState("");
  const [formStartDate, setFormStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formEndDate, setFormEndDate] = useState("");

  const loadAllocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllocations(personId);
      setAllocations(data);
    } catch (err) {
      setError("Failed to load allocations");
      console.error("[PersonAllocationsCard] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [personId]);

  // Load on mount
  useEffect(() => {
    loadAllocations();
  }, [loadAllocations]);

  const handleSave = async () => {
    const percent = parseFloat(formPercent) / 100; // Convert from percentage to 0-1
    if (isNaN(percent) || percent < 0 || percent > 1) {
      toast({
        title: "Invalid percentage",
        description: "Allocation must be between 0% and 100%",
        variant: "destructive",
      });
      return;
    }

    if (!formContextLabel.trim()) {
      toast({
        title: "Label required",
        description: "Please provide a label for this allocation",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await createAllocation({
        personId,
        allocationPercent: percent,
        contextType: formContextType,
        contextLabel: formContextLabel.trim(),
        startDate: formStartDate,
        endDate: formEndDate || null,
      });
      toast({ title: "Allocation created", description: "Work allocation saved successfully." });
      setDialogOpen(false);
      setFormPercent("50");
      setFormContextLabel("");
      setFormEndDate("");
      loadAllocations();
      onAllocationsChanged?.();
    } catch (err: unknown) {
      toast({
        title: "Failed to save",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (allocationId: string) => {
    try {
      await deleteAllocation(allocationId);
      toast({ description: "Allocation deleted" });
      loadAllocations();
      onAllocationsChanged?.();
    } catch (_err) {
      toast({
        title: "Failed to delete",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate active allocations
  const now = new Date();
  const activeAllocations = allocations.filter((a) => {
    const start = new Date(a.startDate);
    const end = a.endDate ? new Date(a.endDate) : null;
    return start <= now && (!end || end >= now);
  });

  const totalPercent = activeAllocations.reduce((sum, a) => sum + a.allocationPercent, 0);
  const isOverallocated = totalPercent > 1;

  if (loading) {
    return (
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-foreground">Commitments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-foreground">Commitments</CardTitle>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total Allocation */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Total Allocation
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-semibold ${isOverallocated ? "text-red-400" : "text-foreground"}`}>
                {Math.round(totalPercent * 100)}%
              </span>
              {isOverallocated && (
                <Badge variant="destructive" className="text-[10px]">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Overallocated
                </Badge>
              )}
            </div>
          </div>

          {/* Active Allocations */}
          {activeAllocations.length > 0 ? (
            <div className="pt-2 border-t border-border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                Active ({activeAllocations.length})
              </div>
              <div className="space-y-2">
                {activeAllocations.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start justify-between gap-2 text-xs p-2 rounded bg-muted/50"
                  >
                    <div className="flex items-start gap-2">
                      <Briefcase className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <div className="text-muted-foreground">
                          {a.contextLabel || getContextTypeLabel(a.contextType)}
                        </div>
                        <div className="text-muted-foreground">
                          {Math.round(a.allocationPercent * 100)}% •{" "}
                          {getContextTypeLabel(a.contextType)}
                          {a.endDate && ` • Until ${formatDate(a.endDate)}`}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(a.id)}
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic">No active allocations</div>
          )}

          {error && (
            <div className="text-xs text-red-400">{error}</div>
          )}
        </CardContent>
      </Card>

      {/* Add Allocation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Work Allocation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="percent">Allocation (%)</Label>
              <Input
                id="percent"
                type="number"
                min="0"
                max="100"
                value={formPercent}
                onChange={(e) => setFormPercent(e.target.value)}
                placeholder="50"
              />
              <p className="text-xs text-muted-foreground">
                Percentage of capacity allocated to this work
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contextType">Type</Label>
              <Select value={formContextType} onValueChange={setFormContextType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROJECT">Project</SelectItem>
                  <SelectItem value="TEAM">Team</SelectItem>
                  <SelectItem value="ROLE">Role</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contextLabel">Label</Label>
              <Input
                id="contextLabel"
                value={formContextLabel}
                onChange={(e) => setFormContextLabel(e.target.value)}
                placeholder="e.g., Q1 Marketing Campaign"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
