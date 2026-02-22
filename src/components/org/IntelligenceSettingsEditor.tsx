"use client";

import { useEffect, useState } from "react";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function IntelligenceSettingsEditor() {
  const settingsQ = useOrgQuery(() => OrgApi.getIntelligenceSettings());

  const [medium, setMedium] = useState("");
  const [high, setHigh] = useState("");
  const [staleDays, setStaleDays] = useState("");
  const [freshMinutes, setFreshMinutes] = useState("");
  const [warnMinutes, setWarnMinutes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settingsQ.data?.settings) {
      setMedium(String(settingsQ.data.settings.mgmtMediumDirectReports));
      setHigh(String(settingsQ.data.settings.mgmtHighDirectReports));
      setStaleDays(String(settingsQ.data.settings.availabilityStaleDays));
      setFreshMinutes(String(settingsQ.data.settings.snapshotFreshMinutes ?? 1440));
      setWarnMinutes(String(settingsQ.data.settings.snapshotWarnMinutes ?? 2880));
    }
  }, [settingsQ.data]);

  async function onSave() {
    setError(null);
    setSaved(false);

    const payload = {
      mgmtMediumDirectReports: Number(medium),
      mgmtHighDirectReports: Number(high),
      availabilityStaleDays: Number(staleDays),
      snapshotFreshMinutes: freshMinutes ? Number(freshMinutes) : undefined,
      snapshotWarnMinutes: warnMinutes ? Number(warnMinutes) : undefined,
    };

    setSaving(true);
    try {
      await OrgApi.updateIntelligenceSettings(payload);
      setSaved(true);
      // Clear saved message after a delay
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Threshold settings (admin)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {settingsQ.loading ? (
          <div className="text-sm text-muted-foreground">Loading settings…</div>
        ) : settingsQ.error ? (
          <div className="text-sm text-destructive">
            Unable to load settings. You may not have access.
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Management load — MEDIUM at</Label>
                <Input
                  value={medium}
                  onChange={(e) => setMedium(e.target.value)}
                  disabled={saving}
                  type="number"
                  min="1"
                />
                <div className="text-xs text-muted-foreground">
                  Direct reports ≥ this threshold.
                </div>
              </div>
              <div className="space-y-2">
                <Label>Management load — HIGH at</Label>
                <Input
                  value={high}
                  onChange={(e) => setHigh(e.target.value)}
                  disabled={saving}
                  type="number"
                  min="1"
                />
                <div className="text-xs text-muted-foreground">
                  Must be greater than MEDIUM.
                </div>
              </div>
              <div className="space-y-2">
                <Label>Availability stale after (days)</Label>
                <Input
                  value={staleDays}
                  onChange={(e) => setStaleDays(e.target.value)}
                  disabled={saving}
                  type="number"
                  min="1"
                  max="365"
                />
                <div className="text-xs text-muted-foreground">1–365 days.</div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Snapshot fresh window (minutes)</Label>
                <Input
                  value={freshMinutes}
                  onChange={(e) => setFreshMinutes(e.target.value)}
                  disabled={saving}
                  type="number"
                  min="5"
                  max="10080"
                />
                <div className="text-xs text-muted-foreground">
                  Recommended: 1440 (24h). Must be ≤ warn window.
                </div>
              </div>
              <div className="space-y-2">
                <Label>Snapshot warn window (minutes)</Label>
                <Input
                  value={warnMinutes}
                  onChange={(e) => setWarnMinutes(e.target.value)}
                  disabled={saving}
                  type="number"
                  min="5"
                  max="20160"
                />
                <div className="text-xs text-muted-foreground">
                  Recommended: 2880 (48h). Must be &gt; fresh window.
                </div>
              </div>
            </div>

            {error && <div className="text-sm text-destructive">{error}</div>}
            {saved && (
              <div className="text-sm text-muted-foreground">Saved.</div>
            )}

            <div className="flex justify-end">
              <Button onClick={onSave} disabled={saving}>
                {saving ? "Saving…" : "Save thresholds"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

