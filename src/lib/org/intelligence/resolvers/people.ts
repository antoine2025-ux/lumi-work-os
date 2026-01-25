/**
 * People Resolver
 *
 * Pure function that computes people signals from intelligence data.
 * No side effects, no Prisma calls, no writes.
 *
 * Canonical rules:
 * - OrgPosition.parentId is primary manager source
 * - Exempt from MISSING_MANAGER: workspace owner OR executive (level === 1)
 * - Multiple non-exempt roots: emit PEOPLE_MULTIPLE_ROOTS warning
 *
 * See docs/org/intelligence-rules.md for canonical rules.
 */

import type { IntelligenceData } from "../queries";
import type { PeopleSignals, EntityRef, ExplainableIssue } from "../types";

// Manager overload threshold (from OrgIntelligenceSettings default)
const MANAGER_OVERLOAD_THRESHOLD = 8;

/**
 * Check if a person is exempt from requiring a manager.
 * Exempt: workspace owner OR executive (level === 1)
 */
function isManagerExempt(
  person: { id: string; level: number },
  workspaceOwnerId: string
): boolean {
  // Workspace owner is exempt
  if (person.id === workspaceOwnerId) {
    return true;
  }

  // Executive (level === 1) is exempt
  if (person.level === 1) {
    return true;
  }

  return false;
}

/**
 * Resolve people signals from intelligence data.
 * Pure function: same input produces same output.
 *
 * @param data - Intelligence data from loadIntelligenceData()
 * @returns People signals
 */
export function resolvePeopleSignals(data: IntelligenceData): PeopleSignals {
  const issues: ExplainableIssue[] = [];
  const peopleWithoutManagers: EntityRef[] = [];

  // Build manager -> direct reports map
  const directReportsMap = new Map<string, string[]>();

  for (const person of data.people) {
    if (person.managerId) {
      const reports = directReportsMap.get(person.managerId) ?? [];
      reports.push(person.id);
      directReportsMap.set(person.managerId, reports);
    }
  }

  // Find people without managers (excluding exempt)
  const nonExemptRoots: EntityRef[] = [];

  for (const person of data.people) {
    if (!person.managerId) {
      const isExempt = isManagerExempt(person, data.workspaceOwnerId);

      if (!isExempt) {
        const personRef: EntityRef = {
          type: "person",
          id: person.id,
          name: person.name ?? undefined,
        };
        peopleWithoutManagers.push(personRef);
        nonExemptRoots.push(personRef);
      }
    }
  }

  // Check for multiple non-exempt roots
  if (nonExemptRoots.length > 1) {
    issues.push({
      code: "PEOPLE_MULTIPLE_ROOTS",
      severity: "warning",
      title: "Multiple people without managers",
      detail: `${nonExemptRoots.length} people have no manager assigned (excluding exempt).`,
      entities: nonExemptRoots,
    });
  }

  // Compute manager load
  const managerLoad: Array<{ manager: EntityRef; directReports: number }> = [];
  const overloadedManagers: Array<{ manager: EntityRef; directReports: number }> = [];

  // Build person lookup for names
  const personLookup = new Map(data.people.map((p) => [p.id, p]));

  for (const [managerId, reports] of directReportsMap.entries()) {
    const manager = personLookup.get(managerId);
    const managerRef: EntityRef = {
      type: "person",
      id: managerId,
      name: manager?.name ?? undefined,
    };

    const loadEntry = {
      manager: managerRef,
      directReports: reports.length,
    };

    managerLoad.push(loadEntry);

    if (reports.length >= MANAGER_OVERLOAD_THRESHOLD) {
      overloadedManagers.push(loadEntry);

      issues.push({
        code: "PEOPLE_MANAGER_OVERLOAD",
        severity: "warning",
        title: "Manager has too many direct reports",
        detail: `${managerRef.name ?? "Manager"} has ${reports.length} direct reports (threshold: ${MANAGER_OVERLOAD_THRESHOLD}).`,
        entities: [managerRef],
      });
    }
  }

  // Sort manager load by direct reports descending
  managerLoad.sort((a, b) => b.directReports - a.directReports);
  overloadedManagers.sort((a, b) => b.directReports - a.directReports);

  return {
    peopleWithoutManagers,
    managerLoad,
    overloadedManagers,
    issues,
  };
}
