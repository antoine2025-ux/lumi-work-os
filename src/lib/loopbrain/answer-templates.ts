/**
 * Loopbrain Answer Templates
 * 
 * Structured output templates for each intent type to ensure consistent,
 * useful answers while maintaining grounding and citations.
 */

import { LoopbrainIntent } from './intent-router'
import { LoopbrainMode } from './orchestrator-types'

/**
 * Get answer template for an intent and mode
 * 
 * Templates are injected into system prompts to guide LLM output structure.
 * They complement grounding rules but do not override them.
 */
export function getAnswerTemplate(intent: LoopbrainIntent, _mode: LoopbrainMode): string {
  switch (intent) {
    case 'capacity_planning':
      return getCapacityPlanningTemplate()
    case 'status_update':
      return getStatusUpdateTemplate()
    case 'who_is_responsible':
      return getWhoIsResponsibleTemplate()
    case 'find_document':
    case 'how_to':
      return getFindDocumentTemplate()
    case 'list_entities':
      return getListEntitiesTemplate()
    case 'prioritization':
      return getPrioritizationTemplate()
    case 'summarize':
      return getSummarizeTemplate()
    default:
      return getDefaultTemplate()
  }
}

/**
 * Capacity planning template
 * 
 * Structured analysis of capacity, availability, and coverage recommendations.
 */
function getCapacityPlanningTemplate(): string {
  return `**Answer Format (capacity planning):**

Structure your answer in these sections (in this exact order):

1. **What you need**
   - Restate the capacity requirement (duration, role/team, scope)
   - Cite any mentioned constraints (source: person:*, time_off:*, team:*)

2. **Constraints**
   - List who is off and when (cite time_off:* objects)
   - List who is overloaded (cite person:* objects with workload metadata)
   - List team-level constraints (cite team:* objects)

3. **Recommended coverage**
   - Ranked list of people who can cover (cite person:* objects)
   - For each person, include: name, role, team, availability status, workload
   - Explain why they're suitable (light load, available, right skills)

4. **Risks**
   - What could go wrong (e.g., "If Jane takes this, her 2 overdue tasks may slip")
   - Coverage gaps (e.g., "No one available in Team X for weeks 2-3")

5. **What I'm missing**
   - Data gaps (e.g., "I don't have time off data for John" or "I don't have workload stats for Team Y")
   - Suggest what additional info would help

**CRITICAL: Every factual claim must cite a source (source: type:id).**
- Availability: cite person:* and time_off:*
- Workload: cite person:* metadata
- Team capacity: cite team:* objects

**Actions (when appropriate):**
If the user's request can be fulfilled by executing an action (assigning a task, creating time off, requesting capacity), you may propose actions in a JSON block labeled ACTIONS_JSON. Format:
\`\`\`json
ACTIONS_JSON
[
  {
    "type": "task.assign",
    "taskId": "task-id",
    "assigneeId": "user-id"
  }
]
\`\`\`
Actions are suggestions only and require explicit user confirmation before execution.`
}

/**
 * Status update template
 * 
 * Structured status report with blockers, next actions, and risks.
 */
function getStatusUpdateTemplate(): string {
  return `**Answer Format (status update):**

Structure your answer in these sections:

1. **Current status**
   - Current state of the entity (project/task/epic)
   - Recent changes or progress
   - Cite the entity (source: project:*, task:*, epic:*)

2. **What's blocking**
   - Blockers or dependencies (cite related tasks/projects)
   - If nothing is blocking, say "No blockers identified"

3. **Next 3 actions**
   - Concrete, actionable next steps
   - Prioritized by urgency/importance
   - Cite any related entities

4. **Risks / due dates**
   - Upcoming deadlines (cite task:* objects with dueDate)
   - At-risk items (cite tasks with status "blocked" or "in-progress" with overdue)
   - If no risks, say "No immediate risks identified"

**CRITICAL: Every factual claim must cite a source (source: type:id).**`
}

/**
 * Who is responsible template
 * 
 * Direct answer with ownership and next steps.
 */
function getWhoIsResponsibleTemplate(): string {
  return `**Answer Format (who is responsible):**

Structure your answer as:

1. **Direct answer** (first line)
   - Name + role + team (if available)
   - Cite the person/role (source: person:*, role:*)

2. **Why** (explanation)
   - Relations that establish ownership (cite relations from ContextObjects)
   - If multiple owners, list all with their roles

3. **Next step suggestion**
   - Suggested action (e.g., "Ask [name] about [entity]" or "Check [entity] status")
   - Tag as: [ACTION: ...]

**CRITICAL: Every factual claim must cite a source (source: type:id).**`
}

/**
 * Find document / how-to template
 * 
 * Document discovery with excerpts and follow-up suggestions.
 */
function getFindDocumentTemplate(): string {
  return `**Answer Format (find document / how-to):**

Structure your answer as:

1. **Best doc(s) list** (max 5)
   - Ranked list of relevant documents/pages
   - For each: title, brief description, relevance
   - Cite each doc (source: page:*, project:*)

2. **Key excerpt bullets**
   - 3-5 key points or excerpts from the top doc(s)
   - Focus on what directly answers the question
   - Cite the source doc

3. **Suggested next question**
   - One follow-up question that would help clarify or expand
   - Format as: "You might also ask: [question]"

**CRITICAL: Every factual claim must cite a source (source: type:id).**`
}

/**
 * List entities template
 * 
 * Grouped list of entities with status/team organization.
 */
function getListEntitiesTemplate(): string {
  return `**Answer Format (list entities):**

Structure your answer as:

1. **Summary count** (first line)
   - Total count and breakdown (e.g., "5 active projects, 2 on-hold")

2. **Grouped list** (5-10 items max)
   - Group by status, team, or department (whichever makes sense)
   - For each item: name, status, key detail (owner/team/priority)
   - Cite each item (source: project:*, task:*, page:*, etc.)

3. **If more items exist**
   - Note: "Showing top 10. There are X more items."

**CRITICAL: Every factual claim must cite a source (source: type:id).**`
}

/**
 * Prioritization template
 * 
 * Ranked items with criteria and risk analysis.
 */
function getPrioritizationTemplate(): string {
  return `**Answer Format (prioritization):**

Structure your answer as:

1. **Ranked items** (with criteria)
   - Top 3-5 items ranked by priority
   - For each: name, priority level, why it's ranked this way
   - Cite each item (source: project:*, task:*, epic:*)

2. **"If we do nothing" risk**
   - What happens if lowest priority items are delayed
   - Cite related dependencies or deadlines

3. **Recommended order**
   - Suggested execution order (numbered list)
   - Brief rationale for the order

**CRITICAL: Every factual claim must cite a source (source: type:id).**`
}

/**
 * Summarize template
 * 
 * Concise summary with key points.
 */
function getSummarizeTemplate(): string {
  return `**Answer Format (summarize):**

Structure your answer as:

1. **TL;DR** (one sentence)
   - Core summary in one line

2. **Key points** (3-5 bullets)
   - Most important details
   - Cite sources for each point (source: type:id)

3. **Context** (if needed)
   - Brief background or related info
   - Cite relevant entities

**CRITICAL: Every factual claim must cite a source (source: type:id).**`
}

/**
 * Default template (for unknown or general intents)
 */
function getDefaultTemplate(): string {
  return `**Answer Format:**

Provide a clear, concise answer with:
- Direct response to the question
- Supporting details with citations (source: type:id)
- If applicable, suggested next steps

**CRITICAL: Every factual claim must cite a source (source: type:id).**`
}

