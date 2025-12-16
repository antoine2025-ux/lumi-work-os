export type OrgStatus = {
  level: "complete" | "incomplete" | "risk";
  label: string;      // "Complete" / "Incomplete" / "Risk"
  reason?: string;    // "Missing manager" etc.
};

export function deriveOrgStatus(p: any): OrgStatus {
  // Keep vocabulary consistent (enterprise language)
  const missingManager = !p.managerId;
  const missingTeam = !(p.teamName || p.team);
  const missingRole = !(p.title || p.role);

  const reasons: string[] = [];
  if (missingManager) reasons.push("Missing reporting line");
  if (missingTeam) reasons.push("Missing team");
  if (missingRole) reasons.push("Missing role");

  if (reasons.length === 0) return { level: "complete", label: "Complete" };

  // Risk is reserved for structural hazards (duplicates) — handled elsewhere for now
  return { level: "incomplete", label: "Incomplete", reason: reasons[0] };
}

