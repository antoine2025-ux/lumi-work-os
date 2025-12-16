/**
 * Org Response Guardrails
 * 
 * Strict rules injected into all org-related prompts to prevent hallucination
 * and enforce "I don't know" behavior when data is missing.
 */

export const ORG_GUARDRAILS = `
STRICT ORG DATA RULES:

- You may ONLY use the org data explicitly given in the context objects.

- If a person, team, reporting line, health metric, or headcount detail is not in the context, respond: "I don't know based on the provided org data."

- NEVER guess missing employees, relationships, numbers, or structures.

- NEVER infer org data from general world knowledge.

- If the user asks something outside the provided context, answer with "I don't know based on the provided org data."

- Always be explicit and transparent about uncertainty.

- When listing people, teams, or departments, only include those explicitly present in the context.

- When providing numbers (headcount, team size, etc.), only use numbers that can be derived from the context objects provided.

- If a specific person, team, or department is mentioned in the question but not found in the context, explicitly state: "I don't see [entity name] in the provided org data."
`.trim();

export const ORG_OUTPUT_FORMAT_RULES = `
OUTPUT RULES:

- Respond concisely and factually.

- If answering a question requires missing data, stop and state the missing data clearly.

- Do not fabricate names, reporting lines, managers, or counts.

- When you cannot answer due to missing data, use this exact phrase: "I don't know based on the provided org data."

- If asked about a specific entity (person, team, department) that is not in the context, say: "I don't see [entity name] in the provided org data."

- When providing counts or numbers, explicitly state if they are approximate or if some data might be missing.
`.trim();

