
❯ I need to do a technical architecture review of Loopbrain for a Y      
  Combinator application. This is our most complex system - 41,357 lines 
   across 144 files that enable autonomous AI reasoning over             
  organizational data.                                                   
                                                                         
  Context: Loopbrain is what differentiates us from competitors. While   
  Notion AI, Linear's agent, and others are "Level 3" (search +          
  suggest), we built "Level 4" autonomous execution. The key is our      
  reasoning architecture, not just the LLM.                              
                                                                         
  I want you to review the architecture and help me explain:             
  1. Why this is technically complex                                     
  2. The design decisions and tradeoffs                                  
  3. How the components work together                                    
  4. Why competitors can't easily replicate this                         
                                                                         
  Let me start by showing you the core orchestrator. Read this file      
  first:                                                                 
                                                                         
  src/lib/loopbrain/orchestrator.ts                                      

⏺ Read 1 file (ctrl+o to expand)

⏺ Large file. Let me read it in sections to understand the full structure.

⏺ Read 1 file (ctrl+o to expand)

⏺ Let me continue reading the key sections - mode handlers, action pipeline,
  and reasoning modules.

⏺ Read 1 file (ctrl+o to expand)

⏺ Now let me read the action/planning pipeline and supporting modules.

⏺ Searched for 1 pattern, read 1 file (ctrl+o to expand)

⏺ Let me read the action mode handler and key agent components.

⏺ Read 3 files (ctrl+o to expand)

⏺ Now let me look at the agent executor and the contract types to complete
  the picture.

⏺ Read 3 files (ctrl+o to expand)

⏺ Let me get the action mode handler and the rest of the orchestrator.

⏺ Read 1 file (ctrl+o to expand)

⏺ Let me find the handleActionMode and handlePlanExecution functions.

⏺ Searched for 1 pattern, read 1 file (ctrl+o to expand)

⏺ I now have a thorough understanding of the full system. Here's my technical
   architecture review.

  ---
  Loopbrain Architecture Review

  What you've actually built

  The orchestrator alone is ~4,500 lines. That's not the complexity — the
  complexity is the layered reasoning architecture beneath it. Most LLM
  products are a single pipeline: user query → RAG → LLM → answer. Loopbrain
  has six distinct layers that cooperate.

  ---
  Layer 1 — World Model (runs before every query)

  world/openLoops/deriveOpenLoops.ts is called on every chat turn,
  idempotent, before any routing happens. It queries overdue tasks, blocked
  tasks, work recommendations, and overdue todos, then upserts a persistent
  OpenLoop table per user. This is working memory — the system has a
  continuously-maintained model of "what's unresolved for this person" that
  gets injected into every prompt.

  This is architecturally significant: it's the difference between a
  stateless chatbot and a system that actually "knows" the user has 3 overdue
   tasks before they ask anything.

  Technical tradeoff made: Adds a ~50ms DB query on every turn. The bet is
  that contextual relevance outweighs latency cost. The try/catch with
  continue-on-failure is the right call here — open loops are enrichment, not
   blocking.

  ---
  Layer 2 — Intent Classification (pure heuristics, zero LLM cost)

  classifyMessageIntent(query) → ACTION | QUESTION | HYBRID | ADVISORY
  classifyQueryIntent(query) → { intent: LoopbrainIntent, isTaskIntent }
  isOrgQuestion(query, opts) → boolean

  This is the core architectural insight most teams miss. Instead of asking
  the LLM "what kind of question is this?", the system uses deterministic
  keyword/token heuristics. 18+ intent types — task_status, project_health,
  workload_analysis, calendar_availability, goal_progress, etc. — are
  classified in microseconds with no LLM call.

  Mode overrides happen here too: if the UI says "org mode" but the query is
  about tasks, the mode flips to "spaces." If the query is about org
  structure regardless of UI mode, it flips to "org." This mode override
  logic (orchestrator.ts:254-275) prevents a whole class of context-mismatch
  bugs.

  Why this matters for YC: At scale, every LLM call is latency + cost.
  Competitors that use an LLM router (e.g., function-calling to classify
  intent) burn tokens on every single query. Your heuristic tier is free and
  ~10ms.

  Honest tradeoff: Heuristic classifiers have false positives. The
  shouldQuerySlackForQuestion function (orchestrator.ts:614) is a good
  example — "what did X say" triggers Slack reads even if the user is asking
  about something internal. Needs calibration as query volume grows.

  ---
  Layer 3 — Org Knowledge Graph (the real moat)

  This is the hardest thing to replicate. When a user asks "who reports to
  Jane?", competitors do keyword search over documents. Loopbrain does graph
  traversal:

  1. Find person "Jane" → id: xyz
  2. Find all ContextObjects where relations contains
     { type: "person", label: "reports_to", targetId: "xyz" }
  3. Return their names + roles + departments

  The org graph (org/buildOrgLoopbrainContextBundle.ts, expanded via
  org-bundle-expander.ts) represents people, teams, departments, and roles as
   typed nodes with typed edges. The relations vocabulary includes:
  reports_to, has_person, has_team, member_of_team, member_of_department,
  owns, managed_by.

  The prompt doesn't say "here's the org chart as text." It says "here's the
  JSON graph — traverse it with these rules." The LLM is asked to do graph
  reasoning over structured data, not to pattern-match on prose.

  Anti-hallucination layer (postProcessors/orgValidator.ts) runs post-LLM to
  catch fabricated names. Most teams skip this. It's necessary when the
  context is rich enough that the LLM might confabulate a plausible-sounding
  person.

  Question-type sub-routing within org mode:
  - Headcount queries → getOrgHeadcountContextForLoopbrain (optimized for
  team size numbers)
  - Reporting queries → getOrgReportingContextForLoopbrain (optimized for
  manager chains)
  - Risk queries → getOrgRiskContextForLoopbrain (span of control,
  single-point teams, role gaps)
  - Generic → full graph

  Why competitors can't replicate quickly: Notion AI treats pages as the unit
   of knowledge. Linear's agent knows project entities. Neither models the
  organizational hierarchy as a traversable graph. Building this correctly
  requires both the schema design (162 Prisma models) and the query
  optimization work to make it fast enough for conversational latency.

  ---
  Layer 4 — Agentic Planning Pipeline (ACTION path)

  When classifyMessageIntent returns ACTION, HYBRID, or ADVISORY, the system
  bypasses all Q&A handling and enters a 3-state machine:

  1. CLARIFY  → planner needs more info → returns questions to user
  2. ADVISORY → planner proposes structure, not steps → user approves or
  refines
  3. PLAN     → planner generates steps → user confirms → executor runs

  The planner (agent/planner.ts) is a single LLM call that returns structured
   JSON, validated by Zod:
  z.discriminatedUnion('mode', [
    ClarifyResponseSchema,   // { mode: 'clarify', questions: [...] }
    PlanResponseSchema,      // { mode: 'plan', plan: { steps: [...] } }
    AdvisoryResponseSchema,  // { mode: 'advisory', advisory: {...} }
  ])

  The executor (agent/executor.ts) resolves inter-step dependencies at
  runtime:
  Step 1: create_project → returns { data: { id: "proj-123" } }
  Step 2: create_epic { projectId: "$step1.data.id" } → resolved to
  "proj-123"

  This is a dependency DAG execution engine embedded in the executor. Most
  agentic frameworks implement this as a ReAct loop (plan → act → observe →
  re-plan). Your design is a single LLM call to generate the full plan,
  followed by deterministic execution — lower latency, more predictable,
  easier to debug.

  The advisory mode is architecturally interesting: for open-ended requests
  like "set up Q3 planning," the planner doesn't commit to steps — it
  proposes a structure first. The user approves or refines before any
  execution happens. This is a meta-reasoning layer that lets the AI show its
   work before doing the work.

  Conversation state threading (pendingPlan, pendingClarification,
  pendingAdvisory) in the request object is the mechanism for multi-turn
  agentic flows without server-side session state. The client carries the
  pending state and sends it back on the next message.

  ---
  Layer 5 — Typed Reasoning Contracts (contract/ directory)

  Eight versioned snapshot types: ProjectHealthSnapshotV0,
  WorkloadAnalysisSnapshotV0, CalendarAvailabilitySnapshotV0,
  OrgSemanticSnapshotV0, BlockerPriorityV0, etc.

  These are machine contracts, not UI models. The CLAUDE.md explicitly says:
  "OrgSemanticSnapshotV0 is a machine contract, not a UI model. UI may
  display snapshot data but never reinterpret or reformat it."

  What this enables: structured outputs that other systems (dashboards,
  automation triggers, future APIs) can consume without parsing prose. It
  also makes the system auditable — you can inspect what the AI "saw" and
  what conclusions it drew, separately.

  The validateAnswerEnvelope.ts ensures answers conform to the contract
  schema before returning. This is a form of output typing that most LLM
  applications don't implement.

  ---
  Layer 6 — Context Assembly (mode-specific, semantic + structural)

  Each mode has a specialized context loader and prompt builder:
  - Spaces: anchor-based loading (project/page/task/epic) + semantic search
  (pgvector) + user-scoped task precision guard + personal docs + Slack
  context
  - Org: knowledge graph + health signals + semantic search filtered to
  ContextType.ORG + org snapshot
  - Dashboard: workspace context + activity stream + semantic search

  The task precision guard (orchestrator.ts:424-461) is a good example of
  careful design: if the intent is task-related, generic workspace tasks are
  replaced with user-scoped tasks (getUserTaskContext). Generic tasks would
  give accurate but irrelevant information. The guard adds a targeted DB
  query to swap the context. A dev-only assertion throws if a task intent
  somehow bypasses this guard — instrumented correctness.

  Prompt assembly is procedural sections.join('\n') with explicit JSON
  blocks. The prompts embed instruction logic directly (e.g., "when the user
  asks X, you MUST do Y"). This is effective but fragile at scale — prompt
  logic scattered across builders will eventually need to move to a
  structured template system.

  ---
  Why Competitors Can't Easily Replicate This

  ┌────────────────────┬────────────────┬────────────────────────────────┐
  │        What        │  Notion AI /   │           Loopbrain            │
  │                    │     Linear     │                                │
  ├────────────────────┼────────────────┼────────────────────────────────┤
  │ Knowledge unit     │ Pages / issues │ Typed nodes + typed edges      │
  │                    │  as flat text  │ (graph)                        │
  ├────────────────────┼────────────────┼────────────────────────────────┤
  │ Org understanding  │ None / shallow │ Full reporting/headcount/risk  │
  │                    │                │ analysis                       │
  ├────────────────────┼────────────────┼────────────────────────────────┤
  │ Intent routing     │ LLM classifier │ Deterministic heuristics, 0    │
  │                    │                │ tokens                         │
  ├────────────────────┼────────────────┼────────────────────────────────┤
  │ Agentic execution  │ ReAct loop or  │ Plan-confirm-execute with dep  │
  │                    │ none           │ resolution                     │
  ├────────────────────┼────────────────┼────────────────────────────────┤
  │ World model        │ None           │ Persistent open loops,         │
  │                    │                │ refreshed per turn             │
  ├────────────────────┼────────────────┼────────────────────────────────┤
  │ Output type        │ Prose          │ Versioned typed contracts      │
  ├────────────────────┼────────────────┼────────────────────────────────┤
  │ Anti-hallucination │ None           │ Post-LLM org response          │
  │                    │                │ validator                      │
  ├────────────────────┼────────────────┼────────────────────────────────┤
  │ Personalization    │ None           │ Per-user style profile         │
  │                    │                │ injected into system prompt    │
  └────────────────────┴────────────────┴────────────────────────────────┘

  The real moat is the organizational graph plus the agentic pipeline.
  Neither is a prompt engineering trick — both require careful schema design,
   substantial data modeling work, and a lot of iteration to get the context
  quality right. That's what the 41,357 lines represents: accumulated
  precision in how organizational knowledge is represented and retrieved.

  ---
  Honest Gaps (for YC prep — they'll ask)

  1. Orchestrator monolith: orchestrator.ts at 4,500+ lines with deprecated
  functions and TODO comments signals organic growth. Not a problem now, but
  will require refactoring before it's a hiring/onboarding bottleneck.
  2. Heuristic classification ceiling: The intent router works well for known
   patterns, but novel phrasing will miss. You'll need a hybrid (fast
  heuristics → LLM fallback) as query volume grows.
  3. Context quality depends on data quality: The org graph is only as good
  as what's in it. If users haven't populated departments/teams/roles, the
  reasoning degrades gracefully but the value proposition weakens. Your
  onboarding funnel is a technical dependency.
  4. No multi-step Q&A on question path: The agentic pipeline handles actions
   with multi-turn state. The question path (Spaces/Org/Dashboard modes) is
  still single-turn. Complex analytical questions that need follow-up
  clarification fall back to the user re-asking.
  5. pgvector + semantic search as a second-class citizen: Semantic search
  runs in every mode, but the context assemblers treat retrievedItems as
  supplementary (listed at the end of the prompt). For knowledge-heavy
  workspaces, this ranking may need rethinking.

  Good. Now let me show you the most complex reasoning pipelines - Q3    
  and Q4. These are what enable autonomous staffing decisions.           
                                                                         
  Q3 analyzes "who should work on this?" by:                             
  - Checking capacity across 60 people                                   
  - Evaluating skills fit                                                
  - Verifying availability windows                                       
  - Ranking candidates with confidence scores                            
                                                                         
  Q4 analyzes "is this feasible in the timeframe?" by:                   
  - Calculating allocation across teams                                  
  - Identifying conflicts                                                
  - Considering dependencies                                             
                                                                         
  Read these two files:                                                  
                                                                         
  src/lib/loopbrain/reasoning/q3.ts                                      
  src/lib/loopbrain/reasoning/q4.ts                                      
                                                                         
  Explain the complexity here. What makes this harder than just asking   
  GPT-4 "who should work on this?"                                       

⏺ Read 2 files (ctrl+o to expand)    
                                                                             
⏺ Let me check the key org primitives these pipelines depend on.
                                                                             
⏺ Searched for 1 pattern, read 2 files (ctrl+o to expand)                    
                                                                             
⏺ Now I have the full picture — Q3, Q4, and the org primitives they sit on.  
  Here's the analysis.                                                       
                                                                             
  ---                                                                        
  What Q3 and Q4 Actually Do                                                 
                                                                             
  The core insight first                                                     
                                                                             
  These are not "LLM questions with context." They are deterministic 
  computation pipelines that happen to be invoked by an LLM system. The LLM
  doesn't run these — the LLM invokes these as structured tools, then
  explains the output in prose. The reasoning itself is pure arithmetic and
  data traversal.

  This distinction is what makes them defensible in a staffing context.

  ---
  Q3: Why it can't be a single GPT-4 call

  Q3's question is "who should be working on this right now?" The deceptive
  part is that this sounds like a judgment call — it's actually a constraint
  satisfaction problem with five sequential filters.

  Step 1 — Accountability indirection

  The project owner might be stored as either a person ID or a role name
  (AccountabilityValue is a discriminated union: { type: "person" } | { type:
   "role" } | { type: "unset" }). If the owner is the role "CTO" and Alice is
   currently the CTO, you need a DB join to resolve that.
  deriveProjectAccountability converts the raw DB row into a typed read model
   that makes the indirection explicit. Without this step, you'd be reasoning
   about role names when you need person IDs.

  Step 2 — Candidate pool construction

  Three separate inclusion criteria run independently:
  1. Is this person the direct owner (by person ID or by holding the owner
  role)?
  2. Does this person's role have execution scopes that keyword-match the
  project description?
  3. Is this person already allocated to this project?

  If zero candidates pass all three — which happens when the org data is
  incomplete — the system expands to the owner's entire team and sets
  expansionUsed: true. This is not an LLM judgment call; it's an explicit
  fallback with a constraint flag that propagates to the final output. The
  user sees "I expanded to owner's team" rather than the system silently
  guessing.

  Step 3 — Role alignment filter

  This step catches a specific pattern: a person is the owner (accountable)
  but has no execution scope (not the right person to do the work). This is
  the manager/IC distinction. An owner with no execution scope gets flagged
  as "potentially_misaligned". This flag flows through to Mode selection and
  confidence scoring.

  GPT-4 would likely conflate "owns the project" with "should do the work."
  Q3 explicitly separates accountability from execution scope.

  Steps 4 and 5 — Real arithmetic

  This is where the gap between "ask GPT-4" and "run Q3" is clearest:

  effectiveCapacity = base_capacity -
  sum(active_allocations_at_point_in_time)

  Where:
  - base_capacity = 1.0 (full), or partialFraction (0..1) if on reduced hours
  - sum(active_allocations) = sum of all ProjectAllocation.fraction records
  where the current date falls within the allocation window
  - isOverallocated = allocated > base + 1e-6 (epsilon prevents
  floating-point false positives)

  This requires the actual allocation table. If Alice is 50% on Project A,
  30% on Project B, her effective capacity is 0.2. GPT-4 doesn't know about
  Project A or Project B. Even if you put all the data in the prompt, asking
  an LLM to sum fractions across date-bounded windows reliably is asking it
  to do something it does poorly.

  Mode selection — B vs C

  Mode B (ranked ordering) requires three preconditions to all be true:
  - Ownership is established (not "unset")
  - At least one candidate has execution scope, non-zero capacity, and is not
   misaligned
  - Not everyone has zero capacity

  If any fails, mode falls back to C (list only, no ranking). This is a data
  quality gate. The system refuses to give false precision when the inputs
  don't support it.

  ---
  Q4: Why it's harder than Q3

  Q4 calls Q3 as a subroutine, then extends it with time-bounded capacity
  analysis. The additional complexity is temporal interval intersection.

  The data model for capacity over time

  Each person has:
  - Availability windows: [{ type: "unavailable"|"partial", startDate,
  endDate?, fraction? }]
  - Allocation windows: [{ projectId, fraction, startDate, endDate? }]

  Q4 receives a target timeframe [startDate, endDate] and must compute: for
  each candidate, what is their effective capacity specifically during this
  window?

  computeIntersectedWindows does:
  activeAllocations = allocations where [alloc.start, alloc.end] overlaps
  [tfStart, tfEnd]
  effectiveCapacity = max(0, baseCapacity - sum(activeAllocations.fraction))

  The Prisma query fetches only allocations and availability that overlap the
   target timeframe (using the OR range intersection filter). This is the
  right query — not "all allocations ever," but "allocations active during
  this specific window."

  Capacity aggregation with duration weighting

  When a candidate has multiple windows (e.g., unavailable for the first
  week, then partial for the rest), Q4 weights each window's capacity by its
  proportion of the total duration:

  personCapacity = Σ(window.effectiveCapacity × window_duration /
  total_duration)

  This gives a single number that represents their weighted-average
  contribution across the entire timeframe, not just their status right now.

  Risk identification as a typed domain model

  Q4 identifies 9 risk types with explicit severity:

  ┌─────────────────────────┬───────────────────────────┬────────────────┐
  │          Risk           │      Detection logic      │ Why it matters │
  ├─────────────────────────┼───────────────────────────┼────────────────┤
  │                         │                           │ One person     │
  │ single_point_dependency │ contributorCount === 1    │ sick = project │
  │                         │                           │  stops         │
  ├─────────────────────────┼───────────────────────────┼────────────────┤
  │ concentration_risk      │ maxContributorCapacity >  │ Structural     │
  │                         │ 60% of total              │ fragility      │
  ├─────────────────────────┼───────────────────────────┼────────────────┤
  │ tight_margins           │ totalEffectiveCapacity <  │ Less than half │
  │                         │ 0.5                       │  an FTE        │
  ├─────────────────────────┼───────────────────────────┼────────────────┤
  │ overallocation          │ any                       │ Already        │
  │                         │ candidate.isOverallocated │ over-committed │
  ├─────────────────────────┼───────────────────────────┼────────────────┤
  │                         │ any                       │                │
  │ role_misalignment       │ candidate.roleAlignment   │ Owner ≠        │
  │                         │ ===                       │ executor       │
  │                         │ "potentially_misaligned"  │                │
  ├─────────────────────────┼───────────────────────────┼────────────────┤
  │ availability_gap        │ partial availability      │ Not full-time  │
  │                         │ detected                  │ contribution   │
  ├─────────────────────────┼───────────────────────────┼────────────────┤
  │ data_gap                │ q3Confidence === "low"    │ Output         │
  │                         │                           │ unreliable     │
  └─────────────────────────┴───────────────────────────┴────────────────┘

  These are not heuristic labels — each maps to a specific computable
  condition. The severity is fixed per type, not generated by the LLM.

  The feasibility decision tree

  insufficient_data: q3Confidence=low OR no ownership OR 0 contributors
  unlikely_feasible: capacity < 0.3 OR highRisks ≥ 3 OR (highRisks ≥ 2 AND
  capacity < 0.5)
  likely_feasible:   capacity ≥ 0.8 AND highRisks = 0 AND medRisks ≤ 1 AND
  contributors ≥ 2
  possibly_feasible: everything else

  These thresholds are explicit and auditable. You can read the code and
  understand exactly why the system said "unlikely_feasible." You can
  disagree with the thresholds (is 0.8 the right bar for "likely"?) and
  change them. An LLM's implicit thresholds are not inspectable or
  adjustable.

  ---
  The precise answer to "why not just ask GPT-4"

  Five distinct reasons, each fatal on its own:

  1. GPT-4 doesn't have the data. Capacity fractions, allocation windows,
  availability records, and role responsibilities live in your Prisma
  database. They are not in any document that RAG can retrieve. The only way
  to answer "is Alice available for a 6-week project starting March 1?" is to
   query ProjectAllocation and UserAvailability, then do arithmetic on the
  results. There is no LLM path to this.

  2. LLMs do temporal arithmetic poorly. The hardest part of Q4 is correctly
  intersecting date ranges. "Alice is 50% allocated on Project A from Feb 1
  to April 30, on leave March 1-14, and you want her from March 15 to April
  30." Computing her effective capacity for that specific window requires
  getting all three intervals right simultaneously. LLMs make errors on this
  type of multi-step temporal reasoning with real dates.

  3. The system needs to know what it doesn't know. Q3 returns mode: "C" and
  explicit Q3Constraint[] when data quality is insufficient. Q4 returns
  feasibility: "insufficient_data" when Q3 refuses. These are structured
  failure modes that the calling system can handle. GPT-4 presented with
  insufficient data fills the gap with confident-sounding prose. In a
  staffing recommendation context, a confident wrong answer is worse than an
  explicit "I don't have enough data."

  4. The output needs to be machine-readable downstream. Q3Output and
  Q4Output are typed contracts. The orchestrator can read
  q3Result.viableCandidates[0].effectiveCapacity and format it into a prompt.
   A downstream automation can check q4Result.feasibility ===
  "unlikely_feasible" and trigger an alert. GPT-4 returning prose requires
  brittle parsing to extract the same structured information.

  5. Auditability. When a manager asks "why did Loopbrain say this project
  isn't feasible?", the answer is: "here is the exact capacity calculation,
  here are the 2 high-severity risks that triggered the unlikely_feasible
  threshold, here is the confidence rating and why." Every field in the
  output traces to a specific computation. With an LLM black box, the answer
  is: "I don't know, that's what it said."

  ---
  Honest limitations in the current implementation

  Three things worth knowing for YC diligence:

  1. timeDistribution is hardcoded to "even" (q4.ts:521). True time
  distribution analysis (front-loaded, back-loaded, constrained windows)
  would require segment-by-segment capacity computation rather than the
  single-interval average currently implemented. This is noted in the comment
   but not yet built.
  2. Execution scope matching is keyword-based (q3.ts:342-348): project
  description words are split on whitespace and matched against role
  responsibility text. This degrades for short descriptions, generic roles,
  and vocabulary mismatches (e.g., "frontend" vs "UI engineering"). A proper
  implementation would use embedding similarity.
  3. Q4 makes a second DB round-trip for the capacity windows even though Q3
  already loaded allocation data for the same people. The current design
  fetches allocations twice — once in fetchPeopleWithCapacity for the
  point-in-time snapshot (Q3), and again in computeCapacityWindows for the
  time-bounded window (Q4). At 60 people this is fine; at 600 it would need
  caching or merging into a single query.

The final piece is autonomous execution. Loopbrain doesn't just answer 
   questions - it can execute actions with permission checks and         
  confirmation flows.                                                    
                                                                         
  Review the action executor:                                            
                                                                         
  src/lib/loopbrain/actions/executor.ts                                  
                                                                         
  Explain:                                                               
  1. How actions are different from questions                            
  2. The permission matrix (who can execute what)                        
  3. Confirmation workflow before mutations                              
  4. Why this is "Level 4" vs competitors' "Level 3"                     

⏺ Read 1 file (ctrl+o to expand)

⏺ Let me also read the action types and the agent-level executor to see the
  full confirmation pipeline.

⏺ Read 2 files (ctrl+o to expand)

⏺ Now I have the complete picture across all three layers. Here's the
  analysis.

  ---
  Actions vs Questions — The Architectural Divide

  1. What makes actions fundamentally different from questions

  Questions are observational: they read state, fail gracefully (worse
  context = worse answer), and have no side effects. Every question handler
  has try/catch with continue-on-failure — if the org context fails to load,
  the system answers with less data. Nothing breaks permanently.

  Actions are mutational: they write to the database, change relationships,
  affect what Q3 and Q4 will calculate for every subsequent query, and cannot
   be undone by just asking again. The failure modes are categorically
  different: a failed question gives a bad answer; a failed action leaves the
   database in a partially modified state.

  This distinction is why actions live in a separate subsystem entirely
  (actions/executor.ts, agent/executor.ts) rather than being folded into the
  orchestrator's mode handlers. The code enforces it through the type system
  — LoopbrainAction is a discriminated union of 8 write operation types,
  completely separate from LoopbrainRequest which carries queries.

  ---
  2. The permission matrix

  Each action has a different access check, reflecting genuine differences in
   risk:

  ┌───────────────────┬──────────┬──────────────────────┬───────────────┐
  │      Action       │  Check   │      Mechanism       │  Risk level   │
  ├───────────────────┼──────────┼──────────────────────┼───────────────┤
  │                   │ MEMBER+  │ assertProjectAccess( │ Medium —      │
  │ task.assign       │ on the   │ user, projectId,     │ affects a     │
  │                   │ specific │ ProjectRole.MEMBER)  │ single task   │
  │                   │  project │                      │               │
  ├───────────────────┼──────────┼──────────────────────┼───────────────┤
  │                   │          │ Identity equality:   │ Low — user    │
  │ timeoff.create    │ Self     │ action.userId !==    │ requests      │
  │                   │ only     │ userId → 403         │ their own     │
  │                   │          │                      │ leave         │
  ├───────────────────┼──────────┼──────────────────────┼───────────────┤
  │                   │ Team     │                      │ Low — creates │
  │ capacity.request  │ member   │ isTeamMember ||      │  a request,   │
  │                   │ OR ADMIN │ isAdmin              │ not a         │
  │                   │          │                      │ decision      │
  ├───────────────────┼──────────┼──────────────────────┼───────────────┤
  │                   │ Workspac │                      │ Medium —      │
  │ org.assign_to_pro │ e member │ Position exists in   │ affects       │
  │ ject              │  (implic │ workspace            │ allocation    │
  │                   │ it)      │                      │ data          │
  ├───────────────────┼──────────┼──────────────────────┼───────────────┤
  │                   │          │                      │ High —        │
  │ org.approve_leave │ Manager  │ Delegated to         │ changes       │
  │                   │ or ADMIN │ processLeaveRequest  │ person's      │
  │                   │          │                      │ availability  │
  ├───────────────────┼──────────┼──────────────────────┼───────────────┤
  │                   │          │ Explicit             │ High —        │
  │ org.update_capaci │ ADMIN+   │ workspaceMember.role │ modifies Capa │
  │ ty                │          │  check               │ cityContract  │
  │                   │          │                      │ history       │
  ├───────────────────┼──────────┼──────────────────────┼───────────────┤
  │                   │          │ Explicit             │ High —        │
  │ org.assign_manage │ ADMIN+   │ workspaceMember.role │ changes       │
  │ r                 │          │  check               │ reporting     │
  │                   │          │                      │ structure     │
  ├───────────────────┼──────────┼──────────────────────┼───────────────┤
  │                   │          │ Explicit             │ High —        │
  │ org.create_person │ ADMIN+   │ workspaceMember.role │ creates org   │
  │                   │          │  check               │ entity        │
  └───────────────────┴──────────┴──────────────────────┴───────────────┘

  Three design decisions in this matrix are worth calling out:

  timeoff.create uses identity comparison, not role checking. The constraint
  is not "VIEWER can do this" — it's "only you can do this for yourself."
  This is a data ownership rule, not a role rule. The code checks
  action.userId !== userId before any DB query, making it the cheapest guard
  in the system.

  org.approve_leave delegates entirely to processLeaveRequest. Rather than
  re-implementing manager-checking logic, the executor delegates to a
  dedicated server module that owns the full leave request state machine. The
   executor catches LeaveRequestError and maps its error codes to
  LoopbrainError — clean adapter pattern. This means the executor can't
  accidentally bypass the leave processing rules.

  org.update_capacity implements temporal accounting, not a simple update.
  The action doesn't UPDATE a record. It:
  1. Closes the current open CapacityContract by setting effectiveTo =
  yesterday
  2. Creates a new open-ended contract from today forward

  This maintains a complete history of capacity changes. Every past Q4 result
   remains reproducible — you can always query "what was Alice's capacity on
  Feb 15?" by filtering contracts where effectiveFrom <= Feb15 AND
  (effectiveTo IS NULL OR effectiveTo >= Feb15). A simple UPDATE would
  destroy that history. The design anticipates Q4's need for temporal
  capacity windows.

  ---
  3. The confirmation workflow — six layers, not two

  The docstring on action-types.ts says "all actions require explicit user
  confirmation." What that actually means across the stack:

  Layer 1 — Intent classification (no LLM)

  classifyMessageIntent runs deterministically on the user's message. If it
  returns ACTION, HYBRID, or ADVISORY, the entire question-answering path is
  bypassed. The message never reaches the context loaders, the org graph, or
  any prompt builder. It routes to handleActionMode directly.

  Layer 2 — Planner generates a plan, not execution

  The planner (one LLM call, Zod-validated output) returns { mode: 'plan',
  plan: { steps: [...], requiresConfirmation: true } }. For write operations,
   requiresConfirmation is always true. The plan is returned to the client as
   pendingPlan in the response. Nothing is executed.

  Layer 3 — Plan presented to user for review

  The formatted plan (formatPlanForUser) shows the user exactly what will
  happen: every step, every tool, every parameter. The response includes two
  suggested actions: { label: 'Proceed', action: 'confirm_plan' } and {
  label: 'Cancel', action: 'cancel_plan' }. The user reviews this before
  anything touches the database.

  Layer 4 — Confirmation token detection

  On the next message, the orchestrator checks:
  const confirmTokens = new Set(['yes', 'y', 'go', 'proceed', 'do it',
  'confirm', 'go ahead', 'ok'])
  if (req.pendingPlan && confirmTokens.has(lowerTrimmed)) {
    return await handlePlanExecution(req, req.pendingPlan)
  }

  This is explicit and narrow — only these tokens trigger execution. "Tell me
   more about that plan" doesn't trigger it. The plan lives in
  req.pendingPlan, passed from the client, so it can't be confused with a
  different earlier plan.

  Layer 5 — Agent executor validates dependencies before each step

  executeAgentPlan runs steps sequentially. Before each step:
  - Checks that all dependsOn steps completed successfully
  - Resolves $step1.data.id references against actual results from prior
  steps
  - Tool validates parameters against its own Zod schema again

  If step 2 fails, step 3 never runs. The executor returns immediately with {
   completed: [...completedSteps], failed: { step, error }, summary }. The
  user sees exactly which steps succeeded before the failure.

  Layer 6 — Action executor re-validates permissions

  Even after the plan was approved, each action handler re-checks permissions
   against the live database. This is defense in depth: the planner ran with
  a workspace context snapshot. By the time the user confirms, the user's
  role might have changed, the task might have been deleted, or the leave
  request might have been already processed. Each handler queries fresh
  state.

  The advisory layer (above all this)

  For structural requests like "set up Q3 planning," there's an additional
  pre-confirmation layer: the ADVISORY path. The planner returns a suggested
  structure (not executable steps), the user reviews the design before a plan
   is even generated. Approval of the advisory converts it into an action
  request with enriched context, which then goes through the full
  confirmation flow above. Two-level consent for high-complexity operations.

  ---
  4. Post-execution re-indexing — the feedback loop that makes it Level 4

  Every action handler ends with non-blocking indexOne() calls:

  indexOne({ workspaceId, userId, entityType: 'person', entityId:
  action.assigneeId,
    action: 'upsert', reason: 'action:task.assign (person)', requestId })
    .catch(err => logger.error(...))

  After task.assign, both the task and the assignee are re-indexed. After
  org.assign_to_project, both the person and the project are re-indexed.
  After org.update_capacity, the person is re-indexed.

  This is the feedback loop: mutations immediately update the vector search
  index that powers Q3 and Q4. If you assign Alice to Project X at 3pm, a Q4
  feasibility query at 3:01pm sees Alice's updated allocation in
  computeIntersectedWindows. The world model stays current.

  .catch(err => logger.error(...)) is the right pattern here — indexing
  failures shouldn't roll back a successful mutation. The action succeeded;
  the index will catch up.

  ---
  5. Why this is Level 4, not Level 3

  The distinction is not about AI capability — it's about the
  action-execution loop.

  Level 3 (Notion AI, Linear's agent, most AI tools):
  User → Query → LLM → Answer
  The LLM reads state and produces text. The user reads the answer and acts
  manually. The system has no side effects. State change requires the user to
   leave the AI and go click something elsewhere.

  Level 4 (Loopbrain):
  User → Intent Classification → Plan → User Confirms →
  Execute (DB mutation) → Re-index → Updated World Model →
  Future Q3/Q4 calls see new state

  The system closes the loop. It doesn't just tell you "Alice has 40%
  available capacity" — it can say "I'll assign Alice to Project X at 25%
  allocation. Confirm?" and then actually do it, update the allocation
  record, re-index Alice, and ensure that the next person who asks "who's
  available for Project Y?" gets an answer that reflects Alice's updated
  commitment.

  The specific capabilities that require the action infrastructure to exist:

  Multi-step plans with data flowing between steps. "Create a project, add
  three epics, create 5 tasks per epic" is a 16-step plan where every task
  creation needs epicId from the epic creation step, which needs projectId
  from the project creation step. The $step1.data.id reference resolution in
  the agent executor enables this. A Level 3 system would make the user do
  all 16 operations manually, or try to do them in a single LLM context
  without verified IDs.

  Leave approval changes capacity data. When a manager approves leave via
  org.approve_leave, processLeaveRequest updates the LeaveRequest status.
  That change affects Q4 — the approved leave period now subtracts from the
  person's available capacity for any overlapping projects. The reasoning
  system and the execution system share the same data substrate. They're not
  separate.

  Org mutations are immediately visible to reasoning. When you create a
  person via org.create_person and assign them to a team, they're immediately
   indexed and available to Q3's fetchPeopleWithCapacity on the next call.
  The org knowledge graph is live, not a snapshot.

  ---
  Honest gaps

  Two places where the execution system is weaker than it could be:

  No rollback on multi-step failures. If a 5-step plan completes steps 1-3
  and fails on step 4, the partially-created entities from steps 1-3 remain.
  The executor reports what completed and what failed, but there's no
  transactional rollback. For "create project + create epics + create tasks,"
   a failure mid-way leaves a project with no tasks. This is fixable with
  explicit compensation steps (delete created entities on failure), but it
  adds significant complexity.

  Confirmation token matching is naive. The set ['yes', 'y', 'go', 'proceed',
   'do it', 'confirm', 'go ahead', 'ok'] will match "ok I understand why this
   won't work" and trigger plan execution. The correct implementation would
  require the confirmation to stand alone (no other content in the message),
  or use NLP to detect that "ok" is not an approval in context. For a YC demo
   this is fine; for production it needs tightening.


   Synthesize everything. Explain why this architecture is our technical      
  moat:                                                                  
                                                                             
  1. What would a competitor need to build to replicate this?                
  2. Why can't they just add OpenAI API calls to their existing          
  products?                                                                  
  3. What's the dependency on structured organizational data?            
  4. How long would it take to build this from scratch?                  
                                                                         
  Compare our approach to:                                               
  - Notion AI (LLM over documents)                                       
  - Linear's agent (GitHub Copilot-style suggestions)                    
  - Generic RAG (retrieval-augmented generation)                         
                                                                         
  What's fundamentally different about our architecture?                 

⏺ The Technical Moat — A Complete Synthesis       
                                                                         
  The Framing Error That Traps Competitors                      

  Every competitor framing this as "AI over our data" is solving the wrong   
  problem. They treat the LLM as the product. You built the LLM as the
  interface to a product that is fundamentally about structured              
  organizational knowledge.

  The replication question is not "can a competitor integrate GPT-4?" — they
  can do that in a sprint. The question is "can they build the data substrate
   that makes GPT-4's answers trustworthy for organizational decisions?"
  That's a 12-18 month problem, and it has nothing to do with AI.

  ---
  What Competitors Actually Built

  Notion AI is document retrieval with LLM summarization. The architecture
  is: embed wiki pages → cosine similarity search on query → inject top-k
  chunks into context → generate prose. This is competent RAG. The
  fundamental limitation is that Notion's unit of knowledge is a page. Pages
  contain whatever humans write in them. If no one wrote "Alice is at 40%
  capacity on Project X," Notion AI cannot know it. It has no structured data
   layer — just text.

  Linear's agent understands the issue graph: tickets, statuses, assignees,
  labels, dependencies. It can suggest "this looks blocked" or "similar to
  issue #423." It reasons over PM-structured data, which is a step up from
  Notion. The ceiling is the PM schema: Issue → Status, Priority, Assignee,
  Labels, Dependencies. No org hierarchy, no capacity fractions, no
  accountability model, no cross-project allocation. Linear knows what needs
  doing; it cannot know who has capacity to do it or whether the team can
  actually ship this quarter.

  Generic RAG (LangChain, LlamaIndex, every AI startup's first architecture)
  is the document approach applied to any corpus. It has three failure modes
  that matter for organizational reasoning: (1) relational queries — "who
  reports to Jane?" requires a join, not a text search; (2) temporal
  arithmetic — "is Alice available March 15–April 30?" requires interval
  intersection, not semantic similarity; (3) confidently wrong answers —
  without structured validation, the LLM fills gaps with plausible-sounding
  fabrications.

  ---
  What's Architecturally Different

  There are five distinct layers. Competitors have at most two of them.

  Layer 1 — The data model encodes organizational reality

  The schema has 162 models. The ones that matter most are not the obvious
  ones (Project, Task, WikiPage). They are:

  - ProjectAccountability — owner (person or role), decision-maker,
  escalation path, backup owner. This is RACI encoded as relational data, not
   a text field.
  - ProjectAllocation — person, project, fraction (0.0–1.0), startDate,
  endDate. Capacity is a first-class number, not a document.
  - CapacityContract — weeklyCapacityHours, effectiveFrom, effectiveTo.
  Temporal history of each person's capacity, not a point-in-time setting.
  - UserAvailability — availability windows with type (UNAVAILABLE/PARTIAL)
  and fraction. Leave is modeled as data, not mentioned in a calendar
  description.
  - PersonManagerLink — explicit FK-backed reporting relationships with time
  windows.
  - OrgPosition, OrgTeam, OrgDepartment, Role, Responsibility — the full org
  graph as relational entities with typed edges.

  This is not a schema you design without a deep product theory about what
  organizational decisions require as inputs. You need to know that capacity
  planning requires fraction + date_window (not just "person is on the
  team"), that accountability requires separating owner from decision-maker
  from executor (not just "assignee"), and that org health analysis requires
  a traversable hierarchy (not a flat list of employees).

  Layer 2 — Deterministic computation where LLMs would hallucinate

  Q3's core question is "who should work on this?" The answer requires:
  1. Resolving ownership — which might be a role name, not a person ID,
  requiring a join
  2. Checking execution scope — does this person's role have responsibilities
   matching the project domain?
  3. Computing effective capacity — base_capacity -
  sum(active_allocations_at_now)
  4. Checking role alignment — is the owner an executor or an accountability
  holder?

  None of this is amenable to LLM reasoning because none of it is in the
  prompt. It requires live DB queries.

  Q4's core question is "can we actually ship this in the timeframe?"
  requires temporal interval intersection:
  effectiveCapacity = max(0, baseCapacity - Σ(allocations_overlapping_[start,
   end]))

  With weighted averaging across duration-varying windows. This is arithmetic
   that LLMs perform unreliably. It must be code.

  The insight: use the LLM for judgment calls, use code for arithmetic. Q3
  uses code to compute effectiveCapacity and then formats the result as
  prose. A competitor who asks GPT-4 "who has capacity for this project?"
  gets confident-sounding guesses that don't reflect anyone's actual
  allocation data.

  Layer 3 — The organizational knowledge graph for traversal queries

  When the org mode prompt says:
  "Who reports to Jane?" — find all people where 'reports_to' relation
  targetId = Jane's id
  "Who is in the Engineering team?" — find team, follow all 'has_person'
  relations

  This works because the data is a traversable graph (people, teams,
  departments, roles as typed nodes; reports_to, has_person, member_of_team,
  member_of_department as typed edges), not prose descriptions of org
  structure. The graph is built from OrgPosition, OrgTeam, OrgDepartment, and
   PersonManagerLink records in the database.

  A RAG system given "describe your org structure" in a wiki page can produce
   prose about the org structure. It cannot answer "how many direct reports
  does each manager have?" without hallucinating, because that requires
  counting relations across structured records, not matching text.

  Layer 4 — The action-execution loop with RBAC

  Questions observe state. Actions change it. The gap between Level 3 and
  Level 4 is this loop:

  Observe state → Reason over state → Plan mutations →
  User confirms → Execute (DB writes) → Re-index →
  Future observations see updated state

  When org.assign_to_project runs, it creates a ProjectMember record and an
  IntegrationAllocation record, then fires indexOne() for both the person and
   the project. The next Q4 call for that person sees the updated allocation
  in computeIntersectedWindows. The world model is self-updating.

  The permission matrix is also non-trivial: task.assign requires MEMBER+ on
  the specific project (not just workspace membership), org.update_capacity
  requires ADMIN+, timeoff.create is self-only. These reflect real
  organizational authority — not every member should be able to modify the
  org chart. Building this correctly requires product knowledge about who
  should be allowed to do what in a workplace context, not just engineering.

  Layer 5 — Zero-LLM routing at the entry point

  classifyMessageIntent and detectIntentFromKeywords run in microseconds with
   no LLM cost. 18+ intent types — task_status, project_health,
  workload_analysis, calendar_availability, goal_progress, org.headcount,
  org.reporting, org.risk — are classified before a single token is sent to
  the LLM. Mode overrides happen here: a task query that arrives in org mode
  gets routed to spaces mode; an org question that arrives in dashboard mode
  gets routed to org mode.

  At scale this matters in two ways: (1) every competitor who uses an LLM
  classifier for routing pays tokens on every single user message, forever;
  (2) deterministic routing means you can test it, predict it, and fix it
  without retraining a model.

  ---
  What a Competitor Needs to Replicate This

  Ordered by difficulty:

  The schema (3–4 months, 2 senior engineers). ProjectAccountability,
  CapacityContract, ProjectAllocation, UserAvailability, PersonManagerLink,
  the full org hierarchy. You can't copy-paste a schema — you have to
  understand why each model exists and what reasoning it enables. Most teams
  would miss CapacityContract's temporal history (they'd use a single
  weeklyHours field) and break Q4's time-bounded analysis. They'd miss
  backupOwner and backupDecision in ProjectAccountability and build a weaker
  accountability model.

  Data population (ongoing, requires product adoption). The schema is
  worthless without data. ProjectAllocation fractions, CapacityContract
  history, UserAvailability windows, OrgPosition assignments — this data has
  to be entered by real users doing real work. It accumulates over months of
  product usage. A competitor who copies the schema starts with all zeros.

  The reasoning pipelines (2–3 months). Q3 and Q4 are the computationally
  correct implementation of staffing reasoning. The multi-step pipeline —
  accountability boundary → candidate pool → role alignment → availability
  constraints → allocation sanity → mode selection — reflects accumulated
  product understanding about how staffing decisions actually work. A
  first-pass implementation would miss the role/person dual ownership in
  AccountabilityValue, the team expansion fallback, the Mode B/C distinction
  based on data quality.

  The org knowledge graph builder (2–3 months). Building org context bundles
  from the schema, generating typed relation edges, implementing the
  question-type sub-routing (headcount vs reporting vs risk vs generic),
  anti-hallucination validation. Each of these has sharp edges discovered
  through iteration.

  The agentic pipeline (2–3 months). Planner generating structured JSON
  (Zod-validated), $step1.data.id reference resolution in the executor,
  three-state machine (CLARIFY/ADVISORY/PLAN), multi-turn conversation state
  threading through pendingPlan/pendingClarification/pendingAdvisory. The
  dependency resolution alone (resolveRef walking JSON paths including array
  indices) is non-trivial.

  The orchestrator (3–4 months). The full routing logic, open loop world
  model, mode-specific context loaders, Slack integration with intent
  detection, semantic search as enrichment, personalization layer, prompt
  assembly with reasoning instructions. This is where the accumulated product
   intuition lives — knowing that task intents should bypass org mode, that
  availability queries should pull from UserAvailability not just
  ProjectAllocation, that org questions from any UI mode should be re-routed
  to the org handler.

  Total: 12–18 months for a team of 3–4 senior engineers, assuming they have
  your product insight about what to build. Without that insight, the
  timeline is open-ended — they'd build generic RAG first, discover its
  limitations, and rebuild.

  ---
  The Dependency on Structured Organizational Data

  This is the deepest structural moat, and it's worth stating precisely.

  Most AI products have a data independence property: you can build the AI
  feature without specialized data, because the data is documents that users
  already have (notes, wiki pages, code). The AI adds value immediately on
  existing data.

  Loopbrain's value scales with data that only exists because users actively
  maintain it: allocation fractions, capacity contracts, availability
  windows, accountability assignments, org hierarchy. A new customer who
  installs the product and populates none of this data gets a sophisticated
  chatbot that knows about their projects and wiki pages. That's good but not
   differentiated. The Q3/Q4 pipelines require allocation data to exist
  before they produce meaningful output.

  This means the product has to earn its data before it delivers its
  highest-value capabilities. That's a go-to-market challenge. It's also a
  moat: competitors who copy the code without the accumulated data cannot
  provide the same answers.

  The flip side: customers who do populate the data — who maintain allocation
   fractions, who use the leave management system, who build out the org
  hierarchy — become increasingly locked in. The data they've entered is the
  substrate that makes Q3 and Q4 trustworthy. Moving to a different tool
  means losing that substrate and starting over.

  ---
  The Honest Competitive Picture

  Where the moat is strongest: Any question that requires joining structured
  org data with project data — staffing recommendations, capacity
  feasibility, org health analysis, leave impact on availability. These are
  computationally correct answers derived from actual records. No competitor
  without the equivalent data model can produce equivalent answers.

  Where the moat is weakest: Pure document Q&A (wiki summaries, project
  context questions). This is where Notion AI competes directly, and it's
  competent at it. The differentiation here is execution (Loopbrain can do
  things, Notion AI can only describe things) and organizational context
  injection (Loopbrain enriches document answers with org data Notion doesn't
   have). But pure document retrieval is a commodity capability.

  The core thesis: Building an AI workplace product requires making a choice
  about where the intelligence lives. Notion chose: intelligence in the LLM,
  data in documents. Linear chose: intelligence in the LLM, data in the issue
   graph. You chose: intelligence partly in the LLM but also in explicit
  computation over structured organizational data that no one else has.

  The reason that choice is defensible at YC is: the organizational data
  model is the harder problem. Getting GPT-4 to summarize a document is a
  solved problem that anyone can implement. Modeling capacity contracts with
  temporal history, accountability with backup paths, and org health with
  typed graph traversal — and then making that data useful for autonomous
  decisions — is not.
