import { formatStatus, formatReason, type OrgStatus as StandardOrgStatus } from "@/lib/org/status";

export type OrgStatus = {
  level: "complete" | "incomplete" | "risk";
  label: string;      // "Complete" / "Incomplete" / "Risk"
  reason?: string;    // Standardized reason from formatReason()
};

export function deriveOrgStatus(p: any): OrgStatus {
  // Keep vocabulary consistent (enterprise language)
  const missingManager = !p.managerId;
  const missingTeam = !(p.teamName || p.team);
  const missingRole = !(p.title || p.role);

  const reasons: string[] = [];
  if (missingManager) reasons.push("missing_reporting_line");
  if (missingTeam) reasons.push("missing_team");
  if (missingRole) reasons.push("missing_role");

  if (reasons.length === 0) {
    return { level: "complete", label: formatStatus("complete") };
  }

  // Risk is reserved for structural hazards (duplicates) — handled elsewhere for now
  return {
    level: "incomplete",
    label: formatStatus("incomplete"),
    reason: formatReason(reasons[0]),
  };
}

