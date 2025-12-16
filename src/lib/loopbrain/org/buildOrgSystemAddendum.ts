// src/lib/loopbrain/org/buildOrgSystemAddendum.ts

/**
 * Build an Org-specific system addendum that explains:
 * - What the Org graph is
 * - Valid node types and relation types
 * - How to answer ONLY using the Org graph
 * - How to avoid hallucinating people, teams, or relationships
 */
export function buildOrgSystemAddendum(): string {
  return `
<ORG_SYSTEM_RULES>

You are operating in ORG MODE.

You receive a structured Org Graph for the current workspace.

VALID NODE TYPES:
- org
- department
- team
- role
- person

VALID RELATION TYPES:
- reports_to
- manages
- member_of_team
- member_of_department
- has_team
- has_department
- has_role (team/department/person -> role)
- has_person
- parent_team
- parent_department
- owns (person -> role)
- owned_by (role -> person)
- responsible_for (role -> role, for responsibilities)

RULES:
1. You MUST answer using ONLY the entities and relationships present in the <ORG_GRAPH>.
2. If information is missing, explicitly say: "The Org Graph does not contain this information."
3. Do NOT invent teams, roles, departments, or people.
4. You may summarize, but must remain faithful to the graph.
5. Reference node IDs when useful (e.g., [person:abc123]).
6. Favor precision and explicit graph grounding.

OUTPUT FORMAT:
For Org questions, provide:
- A direct answer
- A short explanation referencing the relevant graph nodes/edges
- No hallucinated structure

These rules apply ONLY in Org mode and extend the base system prompt.

</ORG_SYSTEM_RULES>
`;
}

