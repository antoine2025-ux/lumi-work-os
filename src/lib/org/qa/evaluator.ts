// src/lib/org/qa/evaluator.ts

import type { OrgQaQuestionWithStatus, OrgQaStatus } from "./types";
import { ORG_QA_QUESTIONS } from "./config";
// 🔽 Adjust this import if your Prisma helper path/name is different
import { prisma } from "@/lib/db";

// Evaluate whether the org has at least one department.
// For now this is global; in future steps we will filter by workspaceId.
async function evaluateHasAnyDepartments(): Promise<{
  status: OrgQaStatus;
  lastUpdated: string;
}> {
  const count = await prisma.orgDepartment.count();
  const lastUpdated = new Date().toISOString();

  if (count > 0) {
    return {
      status: "pass",
      lastUpdated,
    };
  }

  return {
    status: "fail",
    lastUpdated,
  };
}

// Central evaluator for Org QA questions.
// Currently:
// - "org-has-any-departments" uses real Prisma data
// - All other questions remain "stub"
export async function evaluateOrgQaQuestionsForWorkspace(
  _workspaceId: string,
): Promise<OrgQaQuestionWithStatus[]> {
  // TODO: use workspaceId to scope OrgDepartment queries
  const hasDept = await evaluateHasAnyDepartments();

  return ORG_QA_QUESTIONS.map((q) => {
    let status: OrgQaStatus = "stub";
    let lastUpdated: string | null = null;

    if (q.id === "org-has-any-departments") {
      status = hasDept.status;
      lastUpdated = hasDept.lastUpdated;
    }

    return {
      ...q,
      status,
      lastUpdated,
    };
  });
}
