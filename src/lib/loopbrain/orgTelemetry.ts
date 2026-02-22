/**
 * Org Loopbrain Telemetry
 * 
 * Logs Org Loopbrain queries for analytics and debugging.
 * Tracks question types, context usage, and referenced tags.
 */

import { prisma } from "@/lib/db";
import { detectOrgQuestionType } from "./orgQuestionType";

// Import the OrgPromptContext type from orgQaService
type OrgPromptContextForQa =
  | { type: "org.headcount"; context: Record<string, unknown> }
  | { type: "org.reporting"; context: Record<string, unknown> }
  | { type: "org.risk"; context: Record<string, unknown> }
  | { type: "org.generic"; context: Record<string, unknown> };

// Also support the orchestrator's orgContextForPrompt type
type OrgPromptContext = OrgPromptContextForQa | {
  type: string;
  org?: Record<string, unknown>;
  people?: Record<string, unknown>[];
  teams?: Record<string, unknown>[];
  departments?: Record<string, unknown>[];
  roles?: Record<string, unknown>[];
};

type OrgContextSummary = {
  type: string;
  hasOrgRoot: boolean;
  peopleCount: number;
  teamCount: number;
  departmentCount: number;
  roleCount: number;
};

type OrgTelemetryInput = {
  workspaceId: string;
  userId?: string | null;
  question: string;
  orgContext: OrgPromptContext;
  orgContextSummary: OrgContextSummary;
  referencedContextFooter?: string | null;
};

function extractReferencedTags(footer?: string | null): string[] {
  if (!footer) return [];

  const lines = footer
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Example footer format:
  // ---
  // Referenced context:
  // - org:org:...
  // - person:person:...
  // - tag:org_health_label:stable
  const tags: string[] = [];

  for (const line of lines) {
    if (line.startsWith("- tag:")) {
      const value = line.replace("- tag:", "").trim();
      if (value) {
        tags.push(value);
      }
    }
  }

  return tags.slice(0, 20); // Limit to 20 tags
}

export async function logOrgLoopbrainQuery(input: OrgTelemetryInput) {
  const {
    workspaceId,
    userId,
    question,
    orgContext,
    orgContextSummary,
    referencedContextFooter,
  } = input;

  try {
    const questionType = detectOrgQuestionType(question);
    const tags = extractReferencedTags(referencedContextFooter);

    await prisma.orgLoopbrainQuery.create({
      data: {
        workspaceId,
        userId: userId || null,
        question,
        questionType,
        contextType: orgContext.type,
        hasOrgRoot: orgContextSummary.hasOrgRoot,
        peopleCount: orgContextSummary.peopleCount,
        teamCount: orgContextSummary.teamCount,
        departmentCount: orgContextSummary.departmentCount,
        roleCount: orgContextSummary.roleCount,
        referencedTags: tags,
      },
    });
  } catch (error) {
    // Telemetry must never break the main flow
    console.error("[OrgTelemetry] Failed to log org Loopbrain query", error);
  }
}

