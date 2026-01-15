// ContextItem type matching what Prisma returns from contextItem.findMany
type ContextItem = {
  id: string;
  contextId: string;
  workspaceId: string;
  type: string;
  title: string;
  summary: string | null;
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

  const contextObjects = items.map((item) => ({
    id: item.contextId,
    type: item.type,
    title: item.title,
    summary: item.summary ?? null,
  }));

  const system = [
    "You are Loopbrain, the organizational intelligence layer for Loopwell.",
    "You answer questions only using the provided Org context.",
    "",
    "Org context includes:",
    "- Departments (type: department)",
    "- Teams (type: team)",
    "- Roles/positions (type: role)",
    "- People (type: person)",
    "",
    "Rules:",
    "- Use only the given Org context – do not invent departments, teams, or people.",
    "- If the answer cannot be derived from the provided context, say explicitly: \"I don't have enough Org data to answer this from the current context.\"",
    "- Prefer precise, concise answers.",
    "- Keep answers grounded in reporting lines, teams, and roles as described.",
  ].join("\n");

  const user = [
    `Workspace ID: ${workspaceId}`,
    "",
    "Org context objects:",
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

