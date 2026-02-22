/**
 * Person Capacity Card
 * 
 * Displays capacity contract information for a person.
 * Provides edit access to capacity contracts.
 * 
 * Phase G: Weekly capacity hours display and management.
 */

"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Clock, Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type CapacityContract = {
  id: string;
  personId: string;
  weeklyCapacityHours: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
};

type PersonCapacityCardProps = {
  personId: string;
  canEdit?: boolean;
  onCapacityChanged?: () => void;
};

async function fetchContracts(personId: string): Promise<CapacityContract[]> {
  const res = await fetch(`/api/org/capacity/contract?personId=${personId}`);
  if (!res.ok) throw new Error("Failed to fetch contracts");
  const data = await res.json();
  return data.contracts ?? [];
}

async function createContract(data: {
  personId: string;
  weeklyCapacityHours: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}): Promise<CapacityContract> {
  const res = await fetch("/api/org/capacity/contract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create contract");
  }
  const result = await res.json();
  return result.contract;
}

async function deleteContract(contractId: string): Promise<void> {
  const res = await fetch(`/api/org/capacity/contract/${contractId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete contract");
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString();
}

export function PersonCapacityCard({ personId, canEdit = false, onCapacityChanged }: PersonCapacityCardProps) {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<CapacityContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formHours, setFormHours] = useState("40");
  const [formEffectiveFrom, setFormEffectiveFrom] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formEffectiveTo, setFormEffectiveTo] = useState("");

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchContracts(personId);
      setContracts(data);
    } catch (err) {
      setError("Failed to load capacity contracts");
      console.error("[PersonCapacityCard] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [personId]);

  // Load on mount
  useState(() => {
    loadContracts();
  });

  const handleSave = async () => {
    const hours = parseFloat(formHours);
    if (isNaN(hours) || hours < 0 || hours > 168) {
      toast({
        title: "Invalid hours",
        description: "Weekly hours must be between 0 and 168",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await createContract({
        personId,
        weeklyCapacityHours: hours,
        effectiveFrom: formEffectiveFrom,
        effectiveTo: formEffectiveTo || null,
      });
      toast({ title: "Contract created", description: "Capacity contract saved successfully." });
      setDialogOpen(false);
      loadContracts();
      onCapacityChanged?.();
    } catch (err: any) {
      toast({
        title: "Failed to save",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contractId: string) => {
    try {
      await deleteContract(contractId);
      toast({ description: "Contract deleted" });
      loadContracts();
      onCapacityChanged?.();
    } catch (_err) {
      toast({
        title: "Failed to delete",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get current active contract
  const now = new Date();
  const activeContract = contracts.find((c) => {
    const start = new Date(c.effectiveFrom);
    const end = c.effectiveTo ? new Date(c.effectiveTo) : null;
    return start <= now && (!end || end >= now);
  });

  if (loading) {
    return (
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-200">Capacity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-slate-500">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-200">Capacity</CardTitle>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="h-7 px-2 text-slate-400 hover:text-slate-200"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Capacity */}
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">
              Weekly Hours
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-200">
                {activeContract ? `${activeContract.weeklyCapacityHours}h` : "40h"}
              </span>
              {!activeContract && (
                <span className="text-xs text-slate-500">(default)</span>
              )}
            </div>
          </div>

          {/* Contract History */}
          {contracts.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">
                Contracts ({contracts.length})
              </div>
              <div className="space-y-2">
                {contracts.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start justify-between gap-2 text-xs p-2 rounded bg-slate-800/50"
                  >
                    <div className="flex items-start gap-2">
                      <Clock className="h-3 w-3 text-slate-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-slate-300">{c.weeklyCapacityHours}h/week</div>
                        <div className="text-slate-500">
                          From {formatDate(c.effectiveFrom)}
                          {c.effectiveTo && ` to ${formatDate(c.effectiveTo)}`}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(c.id)}
                        className="h-5 w-5 p-0 text-slate-500 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-400">{error}</div>
          )}
        </CardContent>
      </Card>

      {/* Add Contract Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Capacity Contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="hours">Weekly Hours</Label>
              <Input
                id="hours"
                type="number"
                min="0"
                max="168"
                value={formHours}
                onChange={(e) => setFormHours(e.target.value)}
                placeholder="40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effectiveFrom">Effective From</Label>
              <Input
                id="effectiveFrom"
                type="date"
                value={formEffectiveFrom}
                onChange={(e) => setFormEffectiveFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effectiveTo">Effective To (optional)</Label>
              <Input
                id="effectiveTo"
                type="date"
                value={formEffectiveTo}
                onChange={(e) => setFormEffectiveTo(e.target.value)}
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
