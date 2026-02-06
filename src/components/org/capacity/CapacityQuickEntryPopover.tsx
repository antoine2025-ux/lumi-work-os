"use client";

/**
 * CapacityQuickEntryPopover
 *
 * Simplified capacity input: weekly hours, availability %, allocation %.
 * All writes go through capacityQuickEntry.ts via the PATCH API.
 *
 * Invariant: This component never writes directly to CapacityContract / WorkAllocation / PersonAvailability.
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Check, Settings2 } from "lucide-react";

type Props = {
  personId: string;
  personName: string;
  /** Button trigger element. If not provided, uses default gear icon. */
  trigger?: React.ReactNode;
  /** Called after successful save */
  onSaved?: () => void;
};

type QuickEntryData = {
  weeklyHours: number | null;
  availabilityPct: number | null;
  allocationPct: number | null;
  isDefault: boolean;
};

export function CapacityQuickEntryPopover({ personId, personName, trigger, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [weeklyHours, setWeeklyHours] = useState("");
  const [availabilityPct, setAvailabilityPct] = useState("");
  const [allocationPct, setAllocationPct] = useState("");

  const fetchCurrent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/org/capacity/people/${personId}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const qe: QuickEntryData = data.quickEntry;
      setWeeklyHours(qe.weeklyHours != null ? String(qe.weeklyHours) : "40");
      setAvailabilityPct(qe.availabilityPct != null ? String(qe.availabilityPct) : "100");
      setAllocationPct(qe.allocationPct != null ? String(qe.allocationPct) : "100");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    if (open) {
      setSaved(false);
      fetchCurrent();
    }
  }, [open, fetchCurrent]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const body: Record<string, number> = {};
      if (weeklyHours) body.weeklyHours = Number(weeklyHours);
      if (availabilityPct) body.availabilityPct = Number(availabilityPct);
      if (allocationPct) body.allocationPct = Number(allocationPct);

      const res = await fetch(`/api/org/capacity/people/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }

      setSaved(true);
      onSaved?.();
      setTimeout(() => setOpen(false), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium">Capacity for {personName}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">Set weekly hours, availability, and allocation.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={`qe-hours-${personId}`} className="text-xs">Weekly Hours</Label>
                <Input
                  id={`qe-hours-${personId}`}
                  type="number"
                  min="0"
                  max="168"
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`qe-avail-${personId}`} className="text-xs">Availability %</Label>
                <Input
                  id={`qe-avail-${personId}`}
                  type="number"
                  min="0"
                  max="100"
                  value={availabilityPct}
                  onChange={(e) => setAvailabilityPct(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`qe-alloc-${personId}`} className="text-xs">Allocation %</Label>
                <Input
                  id={`qe-alloc-${personId}`}
                  type="number"
                  min="0"
                  max="200"
                  value={allocationPct}
                  onChange={(e) => setAllocationPct(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              )}

              <Button
                onClick={handleSave}
                disabled={saving || saved}
                size="sm"
                className="w-full"
              >
                {saved ? (
                  <><Check className="mr-1.5 h-3.5 w-3.5" /> Saved</>
                ) : saving ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...</>
                ) : (
                  "Save"
                )}
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
