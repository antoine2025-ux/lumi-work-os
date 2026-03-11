/**
 * Availability Windows Editor
 * 
 * Full CRUD UI for availability windows.
 * Neutral labels only - no interpretation.
 */

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrgApi } from "@/components/org/api";
import { Loader2, Plus, Pencil, Trash2, Calendar } from "lucide-react";

type AvailabilityWindow = {
  id: string;
  type: "AVAILABLE" | "UNAVAILABLE" | "PARTIAL";
  startDate: string;
  endDate: string | null;
  fraction: number | null;
  reason: string | null;
  expectedReturnDate: string | null;
  note: string | null;
};

type AvailabilityWindowsEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
  windows: AvailabilityWindow[];
  onSaved?: () => void;
};

const TYPE_OPTIONS = [
  { value: "UNAVAILABLE", label: "Unavailable" },
  { value: "PARTIAL", label: "Partial" },
  { value: "AVAILABLE", label: "Available" },
] as const;

const REASON_OPTIONS = [
  { value: "", label: "None" },
  { value: "VACATION", label: "Vacation" },
  { value: "SICK_LEAVE", label: "Sick Leave" },
  { value: "PARENTAL_LEAVE", label: "Parental Leave" },
  { value: "SABBATICAL", label: "Sabbatical" },
  { value: "JURY_DUTY", label: "Jury Duty" },
  { value: "BEREAVEMENT", label: "Bereavement" },
  { value: "TRAINING", label: "Training" },
  { value: "OTHER", label: "Other" },
] as const;

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString();
}

function toInputDate(isoString: string | null): string {
  if (!isoString) return "";
  return isoString.split("T")[0];
}

export function AvailabilityWindowsEditor({
  open,
  onOpenChange,
  personId,
  windows,
  onSaved,
}: AvailabilityWindowsEditorProps) {
  const [editingWindow, setEditingWindow] = useState<AvailabilityWindow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formType, setFormType] = useState<"AVAILABLE" | "UNAVAILABLE" | "PARTIAL">("UNAVAILABLE");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formFraction, setFormFraction] = useState("0.5");
  const [formReason, setFormReason] = useState("");
  const [formExpectedReturn, setFormExpectedReturn] = useState("");
  const [formNote, setFormNote] = useState("");

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setEditingWindow(null);
      setIsCreating(false);
      setError(null);
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setFormType("UNAVAILABLE");
    setFormStartDate("");
    setFormEndDate("");
    setFormFraction("0.5");
    setFormReason("");
    setFormExpectedReturn("");
    setFormNote("");
  };

  const openCreateForm = () => {
    resetForm();
    setEditingWindow(null);
    setIsCreating(true);
    setError(null);
  };

  const openEditForm = (window: AvailabilityWindow) => {
    setFormType(window.type);
    setFormStartDate(toInputDate(window.startDate));
    setFormEndDate(toInputDate(window.endDate));
    setFormFraction(window.fraction !== null ? String(window.fraction) : "0.5");
    setFormReason(window.reason ?? "");
    setFormExpectedReturn(toInputDate(window.expectedReturnDate));
    setFormNote(window.note ?? "");
    setEditingWindow(window);
    setIsCreating(false);
    setError(null);
  };

  const handleSave = async () => {
    setError(null);

    if (!formStartDate) {
      setError("Start date is required");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        type: formType,
        startDate: new Date(formStartDate).toISOString(),
        endDate: formEndDate ? new Date(formEndDate).toISOString() : null,
        fraction: formType === "PARTIAL" ? parseFloat(formFraction) : null,
        reason: formReason || null,
        expectedReturnDate: formExpectedReturn ? new Date(formExpectedReturn).toISOString() : null,
        note: formNote || null,
      };

      if (editingWindow) {
        // Update existing
        await OrgApi.updateAvailabilityWindow(personId, editingWindow.id, payload);
      } else {
        // Create new
        await OrgApi.createAvailabilityWindow(personId, payload);
      }

      setEditingWindow(null);
      setIsCreating(false);
      resetForm();
      onSaved?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (windowId: string) => {
    setIsDeleting(windowId);
    setError(null);

    try {
      await OrgApi.deleteAvailabilityWindow(personId, windowId);
      onSaved?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(null);
    }
  };

  const showForm = isCreating || editingWindow !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0f1a] border-border sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Availability Windows</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Manage time-bounded availability periods.
          </DialogDescription>
        </DialogHeader>

        {!showForm ? (
          <>
            {/* List view */}
            <div className="space-y-2 py-4">
              {windows.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No availability windows defined.
                </div>
              ) : (
                windows.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                  >
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground">
                        {formatDate(w.startDate)}
                        {w.endDate && ` – ${formatDate(w.endDate)}`}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {w.type === "PARTIAL" && w.fraction !== null
                          ? `Partial (${Math.round(w.fraction * 100)}%)`
                          : w.type === "UNAVAILABLE"
                          ? "Unavailable"
                          : "Available"}
                        {w.reason && ` • ${REASON_OPTIONS.find((r) => r.value === w.reason)?.label ?? w.reason}`}
                      </div>
                      {w.note && (
                        <div className="text-xs text-muted-foreground mt-1 truncate">{w.note}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditForm(w)}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(w.id)}
                        disabled={isDeleting === w.id}
                        className="h-7 w-7 text-muted-foreground hover:text-red-400"
                      >
                        {isDeleting === w.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-border text-muted-foreground"
              >
                Close
              </Button>
              <Button onClick={openCreateForm} className="bg-blue-600 hover:bg-blue-500">
                <Plus className="h-4 w-4 mr-2" />
                Add Window
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Form view */}
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Type */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select value={formType} onValueChange={(v) => setFormType(v as typeof formType)}>
                    <SelectTrigger className="bg-card border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fraction (only for partial) */}
                {formType === "PARTIAL" && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Fraction (0-1)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formFraction}
                      onChange={(e) => setFormFraction(e.target.value)}
                      className="bg-card border-border text-foreground"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Start Date */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Start Date *</Label>
                  <Input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="bg-card border-border text-foreground"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">End Date</Label>
                  <Input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="bg-card border-border text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Reason */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Reason</Label>
                  <Select value={formReason} onValueChange={setFormReason}>
                    <SelectTrigger className="bg-card border-border">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      {REASON_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Expected Return */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Expected Return</Label>
                  <Input
                    type="date"
                    value={formExpectedReturn}
                    onChange={(e) => setFormExpectedReturn(e.target.value)}
                    className="bg-card border-border text-foreground"
                  />
                </div>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Note</Label>
                <Textarea
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Optional note..."
                  className="bg-card border-border text-foreground min-h-[60px]"
                />
              </div>

              {error && <div className="text-xs text-red-400">{error}</div>}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingWindow(null);
                  setIsCreating(false);
                  resetForm();
                }}
                disabled={isSaving}
                className="border-border text-muted-foreground"
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500">
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingWindow ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

