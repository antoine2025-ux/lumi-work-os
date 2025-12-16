import { ORG_QA_QUESTIONS } from "@/lib/loopbrain/org-qa-questions";

export type OrgQaCatalogItem = {
  id: string;
  label: string;
  type: "person" | "team" | "department" | "org";
  description: string | null;
  category: string | null;
};

/**
 * Returns the full Org QA catalog as a normalized array.
 */
export function loadOrgQaCatalog(): OrgQaCatalogItem[] {
  return ORG_QA_QUESTIONS.map((q) => ({
    id: q.id,
    label: q.label,
    type: mapQuestionTypeToCatalogType(q.type),
    description: q.notes ?? null,
    category: inferCategoryFromType(q.type),
  }));
}

/**
 * Maps OrgQaQuestionType to catalog type format.
 */
function mapQuestionTypeToCatalogType(
  type: string
): "person" | "team" | "department" | "org" {
  if (type === "org.person") return "person";
  if (type === "org.team") return "team";
  if (type === "org.department") return "department";
  return "org";
}

/**
 * Infers category from question type.
 */
function inferCategoryFromType(type: string): string | null {
  if (type === "org.person") return "person";
  if (type === "org.team") return "team";
  if (type === "org.department") return "department";
  if (type === "org.org") return "org";
  return null;
}

