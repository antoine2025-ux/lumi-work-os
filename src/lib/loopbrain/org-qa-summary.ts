/**
 * Org QA Summary Helper
 * 
 * Computes summary statistics by question type from Org QA questions.
 */

import type {
  OrgQaQuestion,
  OrgQaSummaryByType,
  OrgQaQuestionType,
  OrgQaStatusOverride,
} from "./org-qa-types";

const TYPE_LABELS: Record<OrgQaQuestionType, string> = {
  "org.person": "Person questions",
  "org.team": "Team questions",
  "org.department": "Department questions",
  "org.role": "Role questions",
  "org.org": "Org-wide questions",
};

/**
 * Apply runtime status overrides to baseline questions.
 * Returns effective questions array where status is overridden when present.
 */
export function applyOrgQaStatusOverrides(
  questions: OrgQaQuestion[],
  overrides: OrgQaStatusOverride[]
): OrgQaQuestion[] {
  if (!overrides.length) return questions;

  const overrideMap = new Map<string, OrgQaStatusOverride>();
  for (const o of overrides) {
    overrideMap.set(o.id, o);
  }

  return questions.map((q) => {
    const override = overrideMap.get(q.id);
    if (!override) return q;
    return {
      ...q,
      status: override.status,
    };
  });
}

export function computeOrgQaSummaryByType(
  questions: OrgQaQuestion[]
): OrgQaSummaryByType[] {
  const map = new Map<OrgQaQuestionType, OrgQaSummaryByType>();

  const ensure = (type: OrgQaQuestionType): OrgQaSummaryByType => {
    if (!map.has(type)) {
      map.set(type, {
        type,
        label: TYPE_LABELS[type],
        total: 0,
        pass: 0,
        partial: 0,
        fail: 0,
      });
    }
    return map.get(type)!;
  };

  for (const q of questions) {
    const bucket = ensure(q.type);
    bucket.total += 1;

    if (q.status === "pass") bucket.pass += 1;
    else if (q.status === "partial") bucket.partial += 1;
    else if (q.status === "fail") bucket.fail += 1;
  }

  // Ensure all types exist even if no questions yet
  (Object.keys(TYPE_LABELS) as OrgQaQuestionType[]).forEach((type) => {
    ensure(type);
  });

  return Array.from(map.values());
}

