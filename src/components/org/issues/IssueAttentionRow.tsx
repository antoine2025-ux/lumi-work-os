/**
 * IssueAttentionRow – Shared issue row component
 *
 * Renders a single issue with severity indicator, entity name,
 * explanation, and an optional Fix CTA.
 *
 * Used by Overview (IntegrityBanner, Live Attention) and
 * Intelligence (IntelligenceIssuesInbox).
 *
 * Does NOT perform extra fetches — all display data comes from
 * OrgIssueMetadata.entityName (carried from derivation).
 */

"use client";

import Link from "next/link";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OrgPrimaryCta } from "@/components/org/ui/OrgCtaButton";
import { cn } from "@/lib/utils";

type IssueAttentionRowProps = {
  issueKey: string;
  severity: "error" | "warning" | "info";
  entityName: string;
  explanation: string;
  fixUrl?: string | null;
  fixAction?: string;
  /** Optional override for the entity label (defaults to entityName) */
  entityLabel?: string;
};

// ── Severity helpers ────────────────────────────────────────────────

function SeverityIcon({ severity }: { severity: "error" | "warning" | "info" }) {
  if (severity === "error") {
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  }
  if (severity === "warning") {
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  }
  return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
}

function SeverityBadge({ severity }: { severity: "error" | "warning" | "info" }) {
  if (severity === "error") {
    return (
      <Badge variant="destructive" className="text-[10px]">
        Critical
      </Badge>
    );
  }
  if (severity === "warning") {
    return (
      <Badge
        variant="secondary"
        className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
      >
        Warning
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px]">
      Info
    </Badge>
  );
}

// ── Row component ───────────────────────────────────────────────────

export function IssueAttentionRow({
  issueKey,
  severity,
  entityName,
  explanation,
  fixUrl,
  fixAction,
  entityLabel,
}: IssueAttentionRowProps) {
  const label = entityLabel ?? entityName;

  return (
    <div
      data-issue-key={issueKey}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50",
        severity === "error" && "border-l-4 border-l-red-500",
        severity === "warning" && "border-l-4 border-l-amber-500"
      )}
    >
      <div className="mt-0.5">
        <SeverityIcon severity={severity} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm truncate">{label}</span>
          <SeverityBadge severity={severity} />
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{explanation}</p>
      </div>

      {fixUrl && (
        <div className="shrink-0">
          <Link href={fixUrl}>
            <OrgPrimaryCta size="sm" className="text-xs">
              {fixAction || "Fix"}
            </OrgPrimaryCta>
          </Link>
        </div>
      )}
    </div>
  );
}
