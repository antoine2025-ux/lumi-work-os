"use client";

import { Download, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type ExportsSectionProps = {
  orgId?: string;
};

/**
 * Org Center → Activity & exports → Exports tab.
 *
 * Provides functionality to export org data as JSON.
 */
export function ExportsSection({ orgId }: ExportsSectionProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);

  if (!orgId) {
    return (
      <section className="rounded-2xl border border-[#111827] bg-[#020617] p-4 text-xs text-slate-400">
        No organization selected.
      </section>
    );
  }

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/org/people/export?format=json`);
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `org-export-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setLastExport(new Date().toLocaleString());
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-[#111827] bg-[#020617] p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
          <FileJson className="h-5 w-5 text-slate-400" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-100">Export Org Data</h3>
          <p className="text-xs text-slate-500">
            Download a JSON snapshot of your organization data.
          </p>
        </div>
      </div>

      <Button
        onClick={handleExport}
        disabled={isExporting}
        variant="secondary"
        className="w-full sm:w-auto"
      >
        <Download className="mr-2 h-4 w-4" />
        {isExporting ? "Exporting..." : "Export to JSON"}
      </Button>

      {lastExport && (
        <p className="text-xs text-slate-500">
          Last exported: {lastExport}
        </p>
      )}
    </section>
  );
}
