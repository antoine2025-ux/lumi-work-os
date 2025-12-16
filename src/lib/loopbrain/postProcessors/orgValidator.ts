/**
 * Org Response Validator
 * 
 * Post-processing validation to detect and prevent hallucinated org data
 * in model responses.
 */

import type { OrgHeadcountContext, OrgReportingContext, OrgRiskContext } from "@/lib/loopbrain/orgSubContexts";
import type { OrgPromptContext } from "@/lib/loopbrain/orgPromptContextBuilder";
import {
  buildReferencedContextSummary,
  formatReferencedContextFooter,
} from "./orgReferencedContext";

type OrgContextForValidation =
  | OrgHeadcountContext
  | OrgReportingContext
  | OrgRiskContext
  | OrgPromptContext;

type OrgPromptContextForValidation =
  | { type: "org.headcount"; context: OrgHeadcountContext }
  | { type: "org.reporting"; context: OrgReportingContext }
  | { type: "org.risk"; context: OrgRiskContext }
  | { type: "org.generic"; context: OrgPromptContext };

/**
 * Validate org response for hallucinated entities.
 * 
 * Checks if the model response mentions people, teams, or departments
 * that don't exist in the provided context.
 * 
 * @param modelOutput - The raw model output
 * @param context - The org context used for the query (legacy format)
 * @param orgPromptContext - Optional org prompt context for footer generation
 * @returns Validated response (may be sanitized if hallucinations detected) with referenced context footer
 */
export function validateOrgResponse(
  modelOutput: string,
  context: OrgContextForValidation,
  orgPromptContext?: OrgPromptContextForValidation
): string {
  // Extract allowed entities from context
  const allowedPeople = new Set<string>();
  const allowedTeams = new Set<string>();
  const allowedDepartments = new Set<string>();

  if ("people" in context && Array.isArray(context.people)) {
    context.people.forEach((person) => {
      if (person.title) {
        allowedPeople.add(person.title.toLowerCase());
        // Also add first/last name variations if name contains spaces
        const nameParts = person.title.toLowerCase().split(/\s+/);
        nameParts.forEach((part) => {
          if (part.length > 2) {
            allowedPeople.add(part);
          }
        });
      }
    });
  }

  if ("teams" in context && Array.isArray(context.teams)) {
    context.teams.forEach((team) => {
      if (team.title) {
        allowedTeams.add(team.title.toLowerCase());
      }
    });
  }

  if ("departments" in context && Array.isArray(context.departments)) {
    context.departments.forEach((dept) => {
      if (dept.title) {
        allowedDepartments.add(dept.title.toLowerCase());
      }
    });
  }

  // Split response into words (case-insensitive)
  const words = modelOutput.toLowerCase().split(/\W+/).filter((w) => w.length > 2);

  // Common words to ignore (not org entities)
  const ignoreWords = new Set([
    "the",
    "and",
    "for",
    "are",
    "but",
    "not",
    "you",
    "all",
    "can",
    "her",
    "was",
    "one",
    "our",
    "out",
    "day",
    "get",
    "has",
    "him",
    "his",
    "how",
    "its",
    "may",
    "new",
    "now",
    "old",
    "see",
    "two",
    "who",
    "way",
    "use",
    "her",
    "she",
    "many",
    "some",
    "time",
    "very",
    "when",
    "come",
    "here",
    "just",
    "like",
    "long",
    "make",
    "much",
    "over",
    "such",
    "take",
    "than",
    "them",
    "well",
    "were",
    "what",
    "with",
    "have",
    "this",
    "will",
    "your",
    "from",
    "they",
    "know",
    "want",
    "been",
    "good",
    "much",
    "some",
    "time",
    "very",
    "when",
    "come",
    "here",
    "just",
    "like",
    "long",
    "make",
    "much",
    "over",
    "such",
    "take",
    "than",
    "them",
    "well",
    "were",
    "what",
    "with",
    "data",
    "org",
    "team",
    "person",
    "people",
    "department",
    "manager",
    "reports",
    "reporting",
    "headcount",
    "health",
    "risk",
    "single",
    "point",
    "overloaded",
    "depth",
    "structure",
    "organization",
    "organizational",
  ]);

  // Detect potentially invented names/entities
  const potentiallyInvented: string[] = [];

  for (const word of words) {
    // Skip common words and allowed entities
    if (ignoreWords.has(word)) continue;
    if (allowedPeople.has(word)) continue;
    if (allowedTeams.has(word)) continue;
    if (allowedDepartments.has(word)) continue;

    // Check if word looks like a name (capitalized in original, or appears in a name-like context)
    // This is a heuristic - we're looking for words that might be invented names
    if (
      word.length >= 3 &&
      /^[a-z]+$/.test(word) &&
      !word.match(/^(the|and|for|are|but|not|you|all|can|her|was|one|our|out|day|get|has|him|his|how|its|may|new|now|old|see|two|who|way|use|many|some|time|very|when|come|here|just|like|long|make|much|over|such|take|than|them|well|were|what|with|have|this|will|your|from|they|know|want|been|good|data|org|team|person|people|department|manager|reports|reporting|headcount|health|risk|single|point|overloaded|depth|structure|organization|organizational)$/i)
    ) {
      // Check if this word appears in a context that suggests it's a name
      // (e.g., "John manages..." or "Team Alpha has...")
      const wordIndex = modelOutput.toLowerCase().indexOf(word);
      if (wordIndex > -1) {
        const before = modelOutput.substring(Math.max(0, wordIndex - 20), wordIndex).toLowerCase();
        const after = modelOutput.substring(wordIndex + word.length, Math.min(modelOutput.length, wordIndex + word.length + 20)).toLowerCase();

        // Check for name-like patterns
        const namePatterns = [
          /\b(manages?|reports? to|works? in|leads?|heads?|member of|part of)\s+$/i,
          /^\s+(manages?|reports? to|works? in|leads?|heads?|member of|part of)\b/i,
          /\b(team|department|person|manager|employee|member)\s+$/i,
          /^\s+(team|department|person|manager|employee|member)\b/i,
        ];

        const looksLikeName = namePatterns.some(
          (pattern) => pattern.test(before) || pattern.test(after)
        );

        if (looksLikeName) {
          potentiallyInvented.push(word);
        }
      }
    }
  }

  // If we detect too many potentially invented names, sanitize the response
  let sanitizedOutput = modelOutput;
  if (potentiallyInvented.length > 3) {
    console.warn("[OrgValidator] Detected potentially invented entities:", potentiallyInvented.slice(0, 5));
    sanitizedOutput = `I'm not able to answer this using the provided org data. Some required details were missing from the context.`;
  }

  // Check for explicit "I don't know" patterns - if present, that's good
  const hasExplicitUncertainty =
    modelOutput.toLowerCase().includes("i don't know") ||
    modelOutput.toLowerCase().includes("i don't see") ||
    modelOutput.toLowerCase().includes("not in the provided") ||
    modelOutput.toLowerCase().includes("missing from the context");

  // If response doesn't have explicit uncertainty but mentions entities not in context,
  // add a warning (but don't block - might be legitimate)
  if (!hasExplicitUncertainty && potentiallyInvented.length > 0) {
    // Log for monitoring but don't block
    console.debug("[OrgValidator] Response mentions entities not clearly in context:", potentiallyInvented.slice(0, 3));
  }

  // Append referenced context footer if orgPromptContext is provided
  // Use sanitized output if response was sanitized, otherwise use original
  let finalOutput = sanitizedOutput;
  if (orgPromptContext) {
    const summary = buildReferencedContextSummary(orgPromptContext);
    const footer = formatReferencedContextFooter(summary);
    if (footer.trim().length > 0) {
      finalOutput = `${finalOutput}${footer}`;
    }
  }

  return finalOutput;
}

