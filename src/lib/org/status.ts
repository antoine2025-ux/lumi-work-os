export type OrgStatus = "complete" | "incomplete";

export function formatStatus(s: OrgStatus) {
  return s === "complete" ? "Complete" : "Incomplete";
}

export function formatReason(reason: string) {
  // Keep reasons consistent and short; extend later.
  switch (reason) {
    case "missing_reporting_line":
      return "Missing reporting line";
    case "missing_owner":
      return "Missing owner";
    case "missing_role":
      return "Missing role";
    case "missing_team":
      return "Missing team";
    default:
      return "Needs attention";
  }
}

