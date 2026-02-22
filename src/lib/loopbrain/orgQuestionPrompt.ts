// ContextItem type matching what Prisma returns from contextItem.findMany
type ContextItem = {
  id: string;
  contextId: string;
  workspaceId: string;
  type: string;
  title: string;
  summary: string | null;
  data?: unknown; // Include data field for rich context
  updatedAt: Date;
};

export type OrgQuestionPromptInput = {
  question: string;
  workspaceId: string;
  items: ContextItem[];
};

export type OrgQuestionPrompt = {
  system: string;
  user: string;
  contextObjects: Array<{
    id: string;
    type: string;
    title: string;
    summary: string | null;
    data?: unknown;
  }>;
};

/**
 * Build a minimal, Org-focused prompt skeleton from Org ContextItems.
 *
 * NOTE: This does not call any LLM. It only structures the text we would send.
 */
export function buildOrgQuestionPrompt(
  input: OrgQuestionPromptInput
): OrgQuestionPrompt {
  const { question, workspaceId, items } = input;

  // Build context objects with full data payload for rich answers
  const contextObjects = items.map((item) => ({
    id: item.contextId,
    type: item.type,
    title: item.title,
    summary: item.summary ?? null,
    data: item.data, // ✅ Include full data payload
  }));

  const system = [
    "You are Loopbrain, the organizational intelligence layer for Loopwell.",
    "You answer questions only using the provided Org context.",
    "",
    "Org context includes:",
    "- Departments (type: department) - Contains department structure, teams, and members",
    "- Teams (type: team) - Contains team members, leader, and workload info",
    "- Roles/positions (type: role) - Contains role details, responsibilities, and reporting structure",
    "- People (type: person) - Contains person details, position, manager, direct reports, team, and department",
    "",
    "Each context object has a 'data' field with detailed information about that entity.",
    "For person objects, data.person contains name/email, data.manager contains manager info, data.reporting contains direct reports.",
    "For role objects, data.role contains position details, data.reporting contains parent/child role relationships.",
    "For team objects, data.team contains team details and member lists.",
    "",
    "Rules:",
    "- Use only the given Org context – do not invent departments, teams, or people.",
    "- If the answer cannot be derived from the provided context, say explicitly: \"I don't have enough Org data to answer this from the current context.\"",
    "- Prefer precise, concise answers.",
    "- Keep answers grounded in reporting lines, teams, and roles as described in the data payloads.",
  ].join("\n");

  const user = [
    `Workspace ID: ${workspaceId}`,
    "",
    "Org context objects (with full data payloads):",
    JSON.stringify(contextObjects, null, 2),
    "",
    "Question:",
    question,
  ].join("\n");

  return {
    system,
    user,
    contextObjects,
  };
}

