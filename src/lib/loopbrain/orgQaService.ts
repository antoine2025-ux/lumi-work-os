/**
 * Org QA Service
 * 
 * Internal service to run the full Org → Loopbrain pipeline
 * for debugging and testing org intelligence.
 */

import { detectOrgQuestionType } from "./orgQuestionType";
import {
  getOrgHeadcountContextForLoopbrain,
  getOrgReportingContextForLoopbrain,
  getOrgRiskContextForLoopbrain,
  type OrgHeadcountContext,
  type OrgReportingContext,
  type OrgRiskContext,
} from "./orgSubContexts";
import { getOrgContextForLoopbrain } from "./orgContextForLoopbrain";
import { buildOrgContextText, type OrgPromptContext } from "./orgPromptContextBuilder";
import { validateOrgResponse } from "./postProcessors/orgValidator";
import { ORG_SYSTEM_PROMPT } from "./prompts/org-system-prompt";
import { buildOrgSystemAddendum } from "./org/buildOrgSystemAddendum";
import { buildOrgFewShotExamples } from "./org/buildOrgFewShotExamples";
import { ORG_GUARDRAILS, ORG_OUTPUT_FORMAT_RULES } from "./promptBlocks/orgGuardrails";
import { callLoopbrainLLM } from "./orchestrator";
import { logOrgLoopbrainQuery } from "./orgTelemetry";
import { LOOPBRAIN_ORG_CONFIG } from "./config";

type OrgPromptContextForQa =
  | { type: "org.headcount"; context: OrgHeadcountContext }
  | { type: "org.reporting"; context: OrgReportingContext }
  | { type: "org.risk"; context: OrgRiskContext }
  | { type: "org.generic"; context: OrgPromptContext };

export type OrgQaResult = {
  finalAnswer: string;
  promptDebug: {
    systemPrompt: string;
    userPrompt: string;
  };
  orgContextSummary: {
    type: string;
    hasOrgRoot: boolean;
    peopleCount: number;
    teamCount: number;
    departmentCount: number;
    roleCount: number;
  };
  referencedContext: {
    footer: string;
  };
};

/**
 * Build org prompt context for QA based on question type.
 */
async function buildOrgPromptContextForQa(
  workspaceId: string,
  question: string
): Promise<OrgPromptContextForQa> {
  const questionType = detectOrgQuestionType(question);

  if (questionType === "headcount") {
    const ctx = await getOrgHeadcountContextForLoopbrain(workspaceId);
    return {
      type: "org.headcount",
      context: ctx,
    };
  }

  if (questionType === "reporting") {
    const ctx = await getOrgReportingContextForLoopbrain(workspaceId);
    return {
      type: "org.reporting",
      context: ctx,
    };
  }

  if (questionType === "risk") {
    const ctx = await getOrgRiskContextForLoopbrain(workspaceId);
    return {
      type: "org.risk",
      context: ctx,
    };
  }

  // Generic fallback
  const full = await getOrgContextForLoopbrain(workspaceId);
  const people = full.related.filter((c) => c.type === "person");
  const teams = full.related.filter((c) => c.type === "team");
  const departments = full.related.filter((c) => c.type === "department");
  const roles = full.related.filter((c) => c.type === "role");

  return {
    type: "org.generic",
    context: {
      org: full.org,
      people,
      teams,
      departments,
      roles,
    },
  };
}

/**
 * Build user prompt text from org context and question.
 */
function buildOrgQaUserPrompt(
  question: string,
  orgContext: OrgPromptContextForQa
): string {
  const sections: string[] = [];

  const { type, context } = orgContext;

  if (type === "org.headcount") {
    sections.push(`## Org Context (Headcount & Composition Focus)`);
    if (context.org) {
      const orgSummary = context.org.summary || "Organization structure";
      sections.push(`Org: ${context.org.title} | ${orgSummary}`);
    }
    sections.push(``);
    sections.push(`### Teams (${context.teams.length} total):`);
    context.teams.slice(0, 25).forEach((team) => {
      sections.push(`- ${team.title} | ${team.summary || "No summary"}`);
    });
    sections.push(``);
    sections.push(`### Departments (${context.departments.length} total):`);
    context.departments.slice(0, 25).forEach((dept) => {
      sections.push(`- ${dept.title} | ${dept.summary || "No summary"}`);
    });
    sections.push(``);
    sections.push(`Use this context to answer headcount and composition questions. Return concrete numbers when possible.`);
  } else if (type === "org.reporting") {
    sections.push(`## Org Context (Reporting Lines Focus)`);
    if (context.org) {
      const orgSummary = context.org.summary || "Organization structure";
      sections.push(`Org: ${context.org.title} | ${orgSummary}`);
    }
    sections.push(``);
    sections.push(`### People (${context.people.length} total, showing up to 40):`);
    context.people.slice(0, 40).forEach((person) => {
      const reportsTo = person.relations.find((r) => r.type === "reports_to");
      const reportsToInfo = reportsTo ? ` | Reports to: ${reportsTo.targetId}` : "";
      sections.push(`- ${person.title}${reportsToInfo} | ${person.summary || "No summary"}`);
    });
    sections.push(``);
    sections.push(`Use the "reports_to" relations to answer reporting line questions. If a relationship is not present, say you don't know.`);
  } else if (type === "org.risk") {
    sections.push(`## Org Context (Risk Analysis Focus)`);
    if (context.org) {
      const orgSummary = context.org.summary || "Organization structure";
      const healthTags = context.org.tags.filter((t) => t.startsWith("org_health"));
      const healthInfo = healthTags.length > 0 ? ` | Health: ${healthTags.join(", ")}` : "";
      sections.push(`Org: ${context.org.title} | ${orgSummary}${healthInfo}`);
    }
    sections.push(``);
    sections.push(`### Teams (${context.teams.length} total):`);
    context.teams.slice(0, 25).forEach((team) => {
      sections.push(`- ${team.title} | ${team.summary || "No summary"}`);
    });
    sections.push(``);
    sections.push(`Use org health tags (org_health_score, org_health_label, org_depth, org_single_point_teams, org_overloaded_managers) and team summaries to evaluate risk. Do not invent risks not justified by the data.`);
  } else {
    // Generic org context
    sections.push(`## Org Context (Authoritative Organizational Structure)`);
    const contextText = buildOrgContextText(context, {
      maxPeople: 20,
      maxTeams: 15,
      maxDepartments: 10,
      maxRoles: 10,
    });
    sections.push(contextText);
  }

  sections.push(``);
  sections.push(`## User Question:`);
  sections.push(question);

  sections.push(``);
  sections.push(`## Instructions:`);
  sections.push(`- Provide a clear, actionable answer based on the context above.`);
  sections.push(`- Use markdown formatting for readability (headings, bullet lists, bold text for emphasis).`);
  sections.push(`- If the context doesn't contain enough information, say so clearly instead of guessing.`);
  sections.push(`- Suggest concrete next steps when appropriate.`);

  return sections.join("\n");
}

/**
 * Run Org QA pipeline for a given workspace and question.
 * 
 * This runs the full pipeline:
 * 1. Detect question type
 * 2. Fetch appropriate org context
 * 3. Build system and user prompts
 * 4. Call LLM
 * 5. Validate response and append footer
 * 6. Log telemetry
 * 
 * @param workspaceId - Workspace ID
 * @param question - User question
 * @param userId - Optional user ID for telemetry
 * @returns Complete QA result with answer, prompts, and metadata
 */
export async function runOrgQa(
  workspaceId: string,
  question: string,
  userId?: string
): Promise<OrgQaResult> {
  // 1. Build org context based on question type
  const orgContext = await buildOrgPromptContextForQa(workspaceId, question);

  // 2. Build context summary
  const orgContextSummary = {
    type: orgContext.type,
    hasOrgRoot: !!orgContext.context.org,
    peopleCount: "people" in orgContext.context ? orgContext.context.people.length : 0,
    teamCount:
      "teams" in orgContext.context && Array.isArray(orgContext.context.teams)
        ? orgContext.context.teams.length
        : 0,
    departmentCount:
      "departments" in orgContext.context && Array.isArray(orgContext.context.departments)
        ? orgContext.context.departments.length
        : 0,
    roleCount:
      "roles" in orgContext.context && Array.isArray(orgContext.context.roles)
        ? orgContext.context.roles.length
        : 0,
  };

  // 3. Build prompts
  const systemPrompt =
    ORG_SYSTEM_PROMPT +
    "\n\n" +
    buildOrgSystemAddendum() +
    "\n\n" +
    buildOrgFewShotExamples() +
    "\n\n" +
    ORG_GUARDRAILS +
    "\n\n" +
    ORG_OUTPUT_FORMAT_RULES;

  const userPrompt = buildOrgQaUserPrompt(question, orgContext);

  // 4. Call LLM with Org-specific config
  const llmResponse = await callLoopbrainLLM(userPrompt, systemPrompt, {
    model: LOOPBRAIN_ORG_CONFIG.model,
    maxTokens: LOOPBRAIN_ORG_CONFIG.maxTokens,
    timeoutMs: LOOPBRAIN_ORG_CONFIG.timeoutMs,
  });

  // 5. Validate response and append footer
  // Extract validation context (the actual context object, not the wrapper)
  const validationContext =
    orgContext.type === "org.headcount"
      ? orgContext.context
      : orgContext.type === "org.reporting"
      ? orgContext.context
      : orgContext.type === "org.risk"
      ? orgContext.context
      : orgContext.context;

  const validatedAnswer = validateOrgResponse(
    llmResponse.content,
    validationContext,
    orgContext
  );

  // Extract footer portion (lines after "---")
  const footerIndex = validatedAnswer.lastIndexOf("\n---");
  let footer = "";
  if (footerIndex !== -1) {
    footer = validatedAnswer.slice(footerIndex).trim();
  }

  // Log telemetry (fire-and-forget)
  void logOrgLoopbrainQuery({
    workspaceId,
    userId: userId || null,
    question,
    orgContext,
    orgContextSummary,
    referencedContextFooter: footer,
  });

  return {
    finalAnswer: validatedAnswer,
    promptDebug: {
      systemPrompt,
      userPrompt,
    },
    orgContextSummary,
    referencedContext: {
      footer,
    },
  };
}

