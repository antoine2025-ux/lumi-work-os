/**
 * Intelligence Issue Group Constants (Server Re-exports)
 *
 * Re-exports shared constants from lib layer for backward compatibility.
 * New code should import directly from @/lib/org/intelligence/constants.
 *
 * @deprecated Import from @/lib/org/intelligence/constants instead
 */

// Re-export shared constants
export {
  OWNERSHIP_ISSUE_TYPES,
  CAPACITY_ISSUE_TYPES,
  WORK_ISSUE_TYPES,
  RESPONSIBILITY_ISSUE_TYPES,
  DECISION_ISSUE_TYPES,
  IMPACT_ISSUE_TYPES,
  STRUCTURE_ISSUE_TYPES,
  getIssueSection,
  type IntelligenceSection,
} from "@/lib/org/intelligence/constants";

// ============================================================================
// Server-Specific Extensions
// ============================================================================

import type { OrgIssue } from "@/lib/org/deriveIssues";
import type { IntelligenceSection } from "@/lib/org/intelligence/constants";
import {
  OWNERSHIP_ISSUE_TYPES,
  CAPACITY_ISSUE_TYPES,
  WORK_ISSUE_TYPES,
  RESPONSIBILITY_ISSUE_TYPES,
  DECISION_ISSUE_TYPES,
  IMPACT_ISSUE_TYPES,
  STRUCTURE_ISSUE_TYPES,
} from "@/lib/org/intelligence/constants";

/**
 * Get all issue types for a section
 */

export function getIssuTypesForSection(section: IntelligenceSection): OrgIssue[] {
  switch (section) {
    case "ownership":
      return OWNERSHIP_ISSUE_TYPES;
    case "capacity":
      return CAPACITY_ISSUE_TYPES;
    case "work":
      return WORK_ISSUE_TYPES;
    case "responsibility":
      return RESPONSIBILITY_ISSUE_TYPES;
    case "decisions":
      return DECISION_ISSUE_TYPES;
    case "impact":
      return IMPACT_ISSUE_TYPES;
    case "structure":
      return STRUCTURE_ISSUE_TYPES;
    default:
      return [];
  }
}

/**
 * Section metadata for UI rendering
 */
export const SECTION_METADATA: Record<
  Exclude<IntelligenceSection, "unknown">,
  {
    label: string;
    description: string;
    primaryLink: string;
    filterLinkPrefix: string;
    requiresAdmin?: boolean;
  }
> = {
  ownership: {
    label: "Ownership",
    description: "Ownership conflicts and unowned entities",
    primaryLink: "/org/ownership",
    filterLinkPrefix: "/org/issues?types=",
  },
  capacity: {
    label: "Capacity",
    description: "Overallocation, low capacity, and coverage gaps",
    primaryLink: "/org/people",
    filterLinkPrefix: "/org/issues?types=",
  },
  work: {
    label: "Work",
    description: "Staffing and feasibility issues",
    primaryLink: "/org/work",
    filterLinkPrefix: "/org/issues?types=",
  },
  responsibility: {
    label: "Responsibility",
    description: "Role alignment and profile issues",
    primaryLink: "/org/settings/responsibility",
    filterLinkPrefix: "/org/issues?types=",
    requiresAdmin: true,
  },
  decisions: {
    label: "Decisions",
    description: "Decision authority and escalation issues",
    primaryLink: "/org/settings/decision-authority",
    filterLinkPrefix: "/org/issues?types=",
    requiresAdmin: true,
  },
  impact: {
    label: "Impact",
    description: "Undefined impacts and high-risk dependencies",
    primaryLink: "/org/work",
    filterLinkPrefix: "/org/issues?types=",
  },
  structure: {
    label: "Structure",
    description: "Org structure and reporting chain issues",
    primaryLink: "/org/structure",
    filterLinkPrefix: "/org/issues?types=",
  },
};

/**
 * Build a filter link for a section's issues
 */
export function buildIssuesFilterLink(section: IntelligenceSection): string {
  const types = getIssuTypesForSection(section);
  const metadata = SECTION_METADATA[section as keyof typeof SECTION_METADATA];
  if (!metadata || types.length === 0) return "/org/issues";
  return `${metadata.filterLinkPrefix}${types.join(",")}`;
}
