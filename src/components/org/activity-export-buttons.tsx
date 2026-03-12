"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

type OrgActivityEventFilter = "all" | "org" | "membership" | "ownership";
type OrgActivityTimeframeFilter = "7d" | "30d" | "90d" | "all";

type ActivityExportButtonsProps = {
  workspaceId: string;
  eventFilter: OrgActivityEventFilter;
  timeframe: OrgActivityTimeframeFilter;
};

export function ActivityExportButtons({
  workspaceId,
  eventFilter,
  timeframe,
}: ActivityExportButtonsProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);

  async function handleExport(format: "csv" | "json") {
    if (exporting) return;

    setExporting(format);
    try {
      const params = new URLSearchParams({
        workspaceId,
        format,
        eventFilter,
        timeframe,
      });

      // Use a simple navigation-based download so the browser handles the file.
      const url = `/api/org/activity/export?${params.toString()}`;
      window.location.href = url;

      // Reset after a short delay to allow the download to start
      setTimeout(() => {
        setExporting(null);
      }, 1000);
    } catch (err: unknown) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Something went wrong while starting the export.",
      });
      setExporting(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <button
        type="button"
        onClick={() => handleExport("csv")}
        disabled={!!exporting}
        className="px-3 py-1.5 border rounded-md hover:bg-muted disabled:opacity-60 transition-colors"
      >
        {exporting === "csv" ? "Exporting CSV…" : "Export CSV"}
      </button>
      <button
        type="button"
        onClick={() => handleExport("json")}
        disabled={!!exporting}
        className="px-3 py-1.5 border rounded-md hover:bg-muted disabled:opacity-60 transition-colors"
      >
        {exporting === "json" ? "Exporting JSON…" : "Export JSON"}
      </button>
      <span className="text-[11px] text-muted-foreground">
        Exports respect the current URL filters (type & timeframe).
      </span>
    </div>
  );
}

