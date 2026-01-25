/**
 * Intelligence Section Configuration (UI Layer)
 *
 * UI-specific metadata for intelligence sections.
 * Keeps drilldown links, table columns, and entity types separate from shared constants.
 *
 * Shared constants (issue-type mapping) are in:
 * @see src/lib/org/intelligence/constants.ts
 */

import type { OrgIssue } from "@/lib/org/deriveIssues";
import type { LucideIcon } from "lucide-react";
import {
  Users,
  Gauge,
  Briefcase,
  Shield,
  Scale,
  Zap,
} from "lucide-react";
import {
  OWNERSHIP_ISSUE_TYPES,
  CAPACITY_ISSUE_TYPES,
  WORK_ISSUE_TYPES,
  RESPONSIBILITY_ISSUE_TYPES,
  DECISION_ISSUE_TYPES,
  IMPACT_ISSUE_TYPES,
} from "./constants";

// ============================================================================
// Section Keys
// ============================================================================

export type IntelligenceSectionKey =
  | "ownership"
  | "capacity"
  | "work"
  | "responsibility"
  | "decisions"
  | "impact";

/**
 * Ordered array of all section keys (for iteration)
 */
export const SECTION_KEYS: IntelligenceSectionKey[] = [
  "ownership",
  "capacity",
  "work",
  "responsibility",
  "decisions",
  "impact",
];

/**
 * Tile sections (top 4 tiles on landing)
 */
export const TILE_SECTION_KEYS: IntelligenceSectionKey[] = [
  "ownership",
  "capacity",
  "work",
  "responsibility",
];

// ============================================================================
// Primary Entity Types
// ============================================================================

export type PrimaryEntityType =
  | "TEAM"
  | "DEPARTMENT"
  | "PERSON"
  | "WORK_REQUEST"
  | "DECISION_DOMAIN";

// ============================================================================
// Table Column Types
// ============================================================================

export type DrilldownTableColumn =
  | "severity"
  | "type"
  | "entity"
  | "explanation"
  | "action";

// ============================================================================
// Section Configuration
// ============================================================================

export type IntelligenceSectionConfig = {
  key: IntelligenceSectionKey;
  label: string;
  description: string;
  icon: LucideIcon;
  drilldownLink: string;
  primaryLink: string; // Fix surface link
  primaryEntity: PrimaryEntityType;
  tableColumns: DrilldownTableColumn[];
  requiresAdmin?: boolean;
  issueTypes: readonly OrgIssue[];
};

/**
 * Canonical section configuration for Intelligence drilldowns.
 * Single source of truth for UI metadata.
 */
export const SECTION_CONFIG: Record<IntelligenceSectionKey, IntelligenceSectionConfig> = {
  ownership: {
    key: "ownership",
    label: "Ownership",
    description: "Ownership conflicts and unowned entities",
    icon: Users,
    drilldownLink: "/org/intelligence/ownership",
    primaryLink: "/org/ownership",
    primaryEntity: "TEAM",
    tableColumns: ["severity", "type", "entity", "explanation", "action"],
    issueTypes: OWNERSHIP_ISSUE_TYPES,
  },
  capacity: {
    key: "capacity",
    label: "Capacity",
    description: "Overallocation, low capacity, and coverage gaps",
    icon: Gauge,
    drilldownLink: "/org/intelligence/capacity",
    primaryLink: "/org/people",
    primaryEntity: "PERSON",
    tableColumns: ["severity", "type", "entity", "explanation", "action"],
    issueTypes: CAPACITY_ISSUE_TYPES,
  },
  work: {
    key: "work",
    label: "Work",
    description: "Staffing and feasibility issues",
    icon: Briefcase,
    drilldownLink: "/org/intelligence/work",
    primaryLink: "/org/work",
    primaryEntity: "WORK_REQUEST",
    tableColumns: ["severity", "type", "entity", "explanation", "action"],
    issueTypes: WORK_ISSUE_TYPES,
  },
  responsibility: {
    key: "responsibility",
    label: "Responsibility",
    description: "Role alignment and profile issues",
    icon: Shield,
    drilldownLink: "/org/intelligence/responsibility",
    primaryLink: "/org/settings/responsibility",
    primaryEntity: "PERSON",
    tableColumns: ["severity", "type", "entity", "explanation", "action"],
    requiresAdmin: true,
    issueTypes: RESPONSIBILITY_ISSUE_TYPES,
  },
  decisions: {
    key: "decisions",
    label: "Decisions",
    description: "Decision authority and escalation issues",
    icon: Scale,
    drilldownLink: "/org/intelligence/decisions",
    primaryLink: "/org/settings/decision-authority",
    primaryEntity: "DECISION_DOMAIN",
    tableColumns: ["severity", "type", "entity", "explanation", "action"],
    requiresAdmin: true,
    issueTypes: DECISION_ISSUE_TYPES,
  },
  impact: {
    key: "impact",
    label: "Impact",
    description: "Undefined impacts and high-risk dependencies",
    icon: Zap,
    drilldownLink: "/org/intelligence/impact",
    primaryLink: "/org/work",
    primaryEntity: "WORK_REQUEST",
    tableColumns: ["severity", "type", "entity", "explanation", "action"],
    issueTypes: IMPACT_ISSUE_TYPES,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get section config by key
 */
export function getSectionConfig(
  key: string
): IntelligenceSectionConfig | undefined {
  return SECTION_CONFIG[key as IntelligenceSectionKey];
}

/**
 * Check if a key is a valid section key
 */
export function isValidSectionKey(key: string): key is IntelligenceSectionKey {
  return key in SECTION_CONFIG;
}

/**
 * Build filter link for Issues page with section types and optional severity
 */
export function buildDrilldownIssuesLink(
  section: IntelligenceSectionKey,
  options?: {
    severity?: "critical" | "warning" | "info";
  }
): string {
  const config = SECTION_CONFIG[section];
  const types = config.issueTypes.join(",");
  let link = `/org/issues?types=${types}`;

  if (options?.severity) {
    link += `&severity=${options.severity}`;
  }

  return link;
}
