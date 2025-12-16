// src/lib/loopbrain/org/buildOrgFewShotExamples.ts

/**
 * Build few-shot examples for Org-mode Q&A that demonstrate:
 * - How to ground answers in the Org Graph
 * - How to respond when data is missing
 * - How to structure concise, graph-grounded responses
 */
export function buildOrgFewShotExamples(): string {
  return `
<ORG_FEW_SHOT_EXAMPLES>

[Example 1 – Manager lookup]

USER QUESTION:
"Who is the manager of Alice?"

ORG GRAPH SNIPPET (simplified):
- person:alice1 { name: "Alice", title: "Product Manager" }
- person:bob1 { name: "Bob", title: "Director of Product" }
- relation: { type: "reports_to", from: "person:alice1", to: "person:bob1" }

ASSISTANT THINKING (hidden):
- Find node for Alice.
- Follow "reports_to" edge.
- Return the target person node as the manager.

ASSISTANT ANSWER:
Alice (person:alice1) reports to Bob (person:bob1), Director of Product, according to the Org Graph.

[Example 2 – Missing information]

USER QUESTION:
"How many people are in the Data Science team?"

ORG GRAPH SNIPPET (simplified):
- team:data-science { name: "Data Science" }
- (No member nodes or edges are present)

ASSISTANT THINKING (hidden):
- There is a team node for Data Science.
- The Org Graph does not list members or a headcount.

ASSISTANT ANSWER:
The Org Graph includes a Data Science team (team:data-science), but it does not list its members or a headcount. I cannot reliably say how many people are in this team from the current graph.

[Example 3 – Team list by department]

USER QUESTION:
"Which teams are in the Engineering department?"

ORG GRAPH SNIPPET (simplified):
- department:eng { name: "Engineering" }
- team:platform { name: "Platform", parent_department: "department:eng" }
- team:frontend { name: "Frontend", parent_department: "department:eng" }
- team:ops { name: "Business Operations", parent_department: "department:ops" }

ASSISTANT THINKING (hidden):
- Find Engineering department node.
- List teams that have parent_department = department:eng.

ASSISTANT ANSWER:
Within the Engineering department, the Org Graph shows these teams:

- Platform (team:platform)
- Frontend (team:frontend)

The Business Operations team (team:ops) belongs to another department and is not part of Engineering.

[Example 4 – Person not in graph]

USER QUESTION:
"Is Charlie part of any team?"

ORG GRAPH SNIPPET (simplified):
- (No person node with name "Charlie")

ASSISTANT THINKING (hidden):
- No node matching Charlie.
- Must explicitly say that the graph does not contain this person.

ASSISTANT ANSWER:
The Org Graph does not contain a person node for Charlie, so I cannot determine which, if any, team they belong to.

[Example 5 – Responsibility lookup via roles]

USER QUESTION:
"Who is responsible for engineering hiring?"

ORG GRAPH SNIPPET (simplified):
- role:head-eng { title: "Head of Engineering", summary: "Responsible for engineering hiring, team building, and technical strategy...", tags: ["responsibilities:5", "team:platform"] }
- person:alice1 { name: "Alice", title: "Head of Engineering" }
- relation: { type: "owned_by", sourceId: "role:head-eng", targetId: "person:alice1" }
- relation: { type: "owns", sourceId: "person:alice1", targetId: "role:head-eng" }

ASSISTANT THINKING (hidden):
- Look for roles whose summary or tags mention "hiring" or "recruiting".
- Found role:head-eng with summary mentioning "engineering hiring".
- Follow "owned_by" relation to find person:alice1.
- Return the person holding that role.

ASSISTANT ANSWER:
According to the Org Graph, the role "Head of Engineering" (role:head-eng) is responsible for engineering hiring. This role is currently held by Alice (person:alice1), Head of Engineering.

[Example 6 – Roles missing owners]

USER QUESTION:
"Which roles in Sales are missing an owner?"

ORG GRAPH SNIPPET (simplified):
- department:sales { name: "Sales" }
- role:sales-ops { title: "Sales Operations Manager", owner: null, relations: [{ type: "member_of_department", targetId: "department:sales" }] }
- role:enterprise-ae { title: "Enterprise AE", owner: null, relations: [{ type: "member_of_department", targetId: "department:sales" }] }
- role:sales-manager { title: "Sales Manager", owner: "person:bob1", relations: [{ type: "member_of_department", targetId: "department:sales" }] }

ASSISTANT THINKING (hidden):
- Filter roles where member_of_department targets department:sales.
- Check role.owner field and owned_by relations.
- Return only roles with no owner (owner is null or missing).

ASSISTANT ANSWER:
In the Sales department, the following roles have no owner assigned:

- Sales Operations Manager (role:sales-ops)
- Enterprise AE (role:enterprise-ae)

The Sales Manager role (role:sales-manager) is held by person:bob1.

[Example 7 – Role responsibilities]

USER QUESTION:
"What are the responsibilities of the Head of Engineering role?"

ORG GRAPH SNIPPET (simplified):
- role:head-eng { title: "Head of Engineering", summary: "Responsible for engineering hiring, team building, technical strategy, and architecture decisions. Key metrics: team growth, code quality, delivery velocity.", tags: ["responsibilities:4", "level:L1", "team:platform"] }

ASSISTANT THINKING (hidden):
- Find role:head-eng.
- Read the summary field which contains responsibilities.
- Check tags for responsibilities count.

ASSISTANT ANSWER:
According to the Org Graph, the Head of Engineering role (role:head-eng) has the following responsibilities:

- Engineering hiring
- Team building
- Technical strategy
- Architecture decisions

Key metrics for this role include team growth, code quality, and delivery velocity. The role belongs to the Platform team and has 4 responsibilities listed.

[Example 8 – Org Health Summary]

USER QUESTION:
"Give me a quick health summary of my organization."

ORG GRAPH SNIPPET (simplified):
- health: { score: 72, label: "Stable", spanOfControl: { overloadedManagers: 2, underloadedManagers: 1 }, teamBalance: { singlePointTeams: 1, largestTeamSize: 7 }, roles: { summary: { rolesWithoutOwner: 3, rolesWithoutResponsibilities: 1, rolesWithoutTeam: 2, rolesWithoutDepartment: 0 } } }

ASSISTANT THINKING (hidden):
1) Inspect health.score and health.label for the high-level status.
2) Look at span-of-control signals (overloaded/underloaded managers).
3) Check team structure issues (single-point teams, very large teams).
4) Examine role risks in health.roles.summary (roles without owner, responsibilities, team, or department).
5) Combine these into a grounded summary.

ASSISTANT ANSWER:
Your organization is currently "Stable" with a score of 72.

- **Managers**: 2 overloaded managers and 1 underloaded manager indicate some imbalance in span of control.
- **Teams**: 1 single-point team is a potential risk if that person leaves.
- **Roles**: 3 roles have no owner and 2 roles are not attached to any team. This makes responsibilities unclear and can slow execution.

Suggested next steps:
- Assign clear owners to the unowned roles.
- Attach floating roles to real teams.
- Review the overloaded managers to see if responsibilities can be redistributed.

[Example 9 – Org Health Score Explanation]

USER QUESTION:
"Explain this org health score."

ORG GRAPH SNIPPET (simplified):
- health: { score: 72, label: "Stable", spanOfControl: { overloadedManagers: 2, underloadedManagers: 1 }, teamBalance: { singlePointTeams: 1, largestTeamSize: 7 }, roles: { summary: { rolesWithoutOwner: 3, rolesWithoutResponsibilities: 1, rolesWithoutTeam: 2, rolesWithoutDepartment: 0 } } }

ASSISTANT THINKING (hidden):
- Read health.score and health.label for the high-level status.
- Look at span-of-control, team structure, org depth, and role risks.
- Summarize key findings and propose concrete next steps.

ASSISTANT ANSWER:
Based on your data:

**Overall status**: "Stable" with a score of 72. The structure mostly works but has clear risks.

**Key drivers**:
- 2 overloaded managers handling 10+ direct reports each.
- 1 single-point team where one person owns a critical function.
- 3 roles without owners and 2 roles not attached to any team, which makes responsibilities unclear.

**Recommended next actions**:
1) Re-balance the overloaded managers by moving 2–3 reports each to peers or new leads.
2) Assign clear owners to the 3 unowned roles, prioritizing high-impact functions.
3) Attach the "Data Quality Lead" and "Compliance Coordinator" roles to actual teams.
4) Create a backup or deputy for the single-point team to reduce risk.

</ORG_FEW_SHOT_EXAMPLES>
`;
}

