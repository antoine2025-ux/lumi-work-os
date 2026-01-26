"use client";

/**
 * Capacity Settings Client
 *
 * Configure capacity thresholds for the workspace.
 * Small, boring, explicit form with clear explanations.
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from "lucide-react";

type CapacityThresholds = {
  lowCapacityHoursThreshold: number;
  overallocationThreshold: number;
  minCapacityForCoverage: number;
  issueWindowDays: number;
};

export function CapacitySettingsClient() {
  const [thresholds, setThresholds] = useState<CapacityThresholds | null>(null);
  const [defaults, setDefaults] = useState<CapacityThresholds | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formValues, setFormValues] = useState({
    lowCapacityHoursThreshold: "",
    overallocationThreshold: "",
    minCapacityForCoverage: "",
    issueWindowDays: "",
  });

  const fetchThresholds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/org/settings/capacity");
      if (!response.ok) throw new Error("Failed to fetch thresholds");

      const data = await response.json();
      setThresholds(data.thresholds);
      setDefaults(data.defaults);

      // Initialize form with current values
      setFormValues({
        lowCapacityHoursThreshold: String(data.thresholds.lowCapacityHoursThreshold),
        overallocationThreshold: String(Math.round(data.thresholds.overallocationThreshold * 100)),
        minCapacityForCoverage: String(data.thresholds.minCapacityForCoverage),
        issueWindowDays: String(data.thresholds.issueWindowDays),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThresholds();
  }, [fetchThresholds]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch("/api/org/settings/capacity", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lowCapacityHoursThreshold: Number(formValues.lowCapacityHoursThreshold),
          overallocationThreshold: Number(formValues.overallocationThreshold) / 100,
          minCapacityForCoverage: Number(formValues.minCapacityForCoverage),
          issueWindowDays: Number(formValues.issueWindowDays),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to save");
      }

      const data = await response.json();
      setThresholds(data.thresholds);
      setSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (defaults) {
      setFormValues({
        lowCapacityHoursThreshold: String(defaults.lowCapacityHoursThreshold),
        overallocationThreshold: String(Math.round(defaults.overallocationThreshold * 100)),
        minCapacityForCoverage: String(defaults.minCapacityForCoverage),
        issueWindowDays: String(defaults.issueWindowDays),
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading thresholds...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error state */}
      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success state */}
      {success && (
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Thresholds saved successfully</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Capacity Settings</CardTitle>
          <CardDescription>
            Defaults and thresholds used for capacity reasoning. These determine when capacity is 
            considered low, when someone is overallocated, and the time window for issue detection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Low Capacity Hours */}
          <div className="space-y-2">
            <Label htmlFor="lowCapacityHoursThreshold">
              Low Capacity Threshold (hours)
            </Label>
            <Input
              id="lowCapacityHoursThreshold"
              type="number"
              min="0"
              value={formValues.lowCapacityHoursThreshold}
              onChange={(e) =>
                setFormValues((v) => ({ ...v, lowCapacityHoursThreshold: e.target.value }))
              }
              className="max-w-[200px]"
            />
            <p className="text-sm text-muted-foreground">
              Hours below which capacity is considered &quot;low&quot;. Used to determine overload risks.
            </p>
          </div>

          {/* Overallocation Threshold */}
          <div className="space-y-2">
            <Label htmlFor="overallocationThreshold">
              Overallocation Threshold (%)
            </Label>
            <Input
              id="overallocationThreshold"
              type="number"
              min="1"
              value={formValues.overallocationThreshold}
              onChange={(e) =>
                setFormValues((v) => ({ ...v, overallocationThreshold: e.target.value }))
              }
              className="max-w-[200px]"
            />
            <p className="text-sm text-muted-foreground">
              Allocation percentage above which someone is considered overallocated. 100 = fully allocated.
            </p>
          </div>

          {/* Min Capacity for Coverage */}
          <div className="space-y-2">
            <Label htmlFor="minCapacityForCoverage">
              Minimum Hours for Coverage Viability
            </Label>
            <Input
              id="minCapacityForCoverage"
              type="number"
              min="0"
              value={formValues.minCapacityForCoverage}
              onChange={(e) =>
                setFormValues((v) => ({ ...v, minCapacityForCoverage: e.target.value }))
              }
              className="max-w-[200px]"
            />
            <p className="text-sm text-muted-foreground">
              Minimum available hours for a secondary to be considered viable for coverage.
            </p>
          </div>

          {/* Issue Window Days */}
          <div className="space-y-2">
            <Label htmlFor="issueWindowDays">
              Issue Detection Window (days)
            </Label>
            <Input
              id="issueWindowDays"
              type="number"
              min="1"
              max="90"
              value={formValues.issueWindowDays}
              onChange={(e) =>
                setFormValues((v) => ({ ...v, issueWindowDays: e.target.value }))
              }
              className="max-w-[200px]"
            />
            <p className="text-sm text-muted-foreground">
              Days forward to look for capacity issues. Affects the Issues and Intelligence views.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
            <Button variant="outline" onClick={handleResetToDefaults} disabled={saving}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
