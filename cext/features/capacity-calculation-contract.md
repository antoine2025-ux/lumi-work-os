# Capacity Calculation Contract v1.0

> **Status:** Draft — pending implementation
> **Owner:** Tony (CEO)
> **Consumers:** Capacity engine (`src/lib/org/capacity/`), Loopbrain Q5/Q6, `deriveIssues.ts`, Org Health scoring
> **Date:** March 14, 2026

---

## 1. Purpose

Define the rules for calculating a person's work capacity, utilization, and overallocation status. This contract is the single source of truth for all capacity-related calculations in Loopwell — the capacity engine, Loopbrain reasoning, issue detection, and UI displays all derive from these rules.

---

## 2. Core Concepts

### 2.1 Capacity Contract (the denominator)

Every person has a **capacity contract** — their baseline available hours per week.

| Field | Source | Default |
|-------|--------|---------|
| `weeklyHours` | `CapacityContract.weeklyHours` | 40 |
| `workingDays` | `CapacityContract.workingDays` | `[MON, TUE, WED, THU, FRI]` |
| `workingHoursStart` | `OrgCapacitySettings.workingHoursStart` | `08:00` |
| `workingHoursEnd` | `OrgCapacitySettings.workingHoursEnd` | `17:00` |

**Daily hours** = `weeklyHours / workingDays.length`
- Default: 40 / 5 = 8 hours/day

**Monthly hours** = `weeklyHours × weeksInPeriod`
- For a 4-week month: 40 × 4 = 160 hours
- Use actual calendar weeks (count working days in the month × daily hours) for precision

**Part-time and non-standard contracts:**
- A person working 3 days/week at 8h/day has `weeklyHours = 24`, `workingDays = [MON, WED, FRI]`
- A person working 4 days at 10h/day has `weeklyHours = 40`, `workingDays = [MON, TUE, WED, THU]`

If no `CapacityContract` exists for a person, assume the workspace defaults from `OrgCapacitySettings` (or system defaults: 40h/week, Mon–Fri, 8am–5pm).

---

### 2.2 Effective Available Hours (what's actually available)

```
Effective Available Hours = Contract Hours (for period)
                          − Meeting Hours
                          − Time Off Hours
```

This is the real denominator for utilization. A person with a 40h/week contract who has 8 hours of meetings and 8 hours of PTO in a week has 24 effective hours available for task work.

---

### 2.3 Task Commitment Hours (the numerator)

```
Task Commitment Hours = Σ estimated hours for all tasks assigned to person in period
```

Estimation hierarchy (use the first available):

1. **Explicit `estimatedHours`** — if the task has an `estimatedHours` field set, use it
2. **Points-based derivation** — if the task has `points` set (0–100 scale), convert: `estimatedHours = points × pointsMultiplier`
3. **Priority-based default** — if neither exists, derive from task priority

See §4 for full task estimation rules.

---

### 2.4 Utilization

```
Utilization % = (Task Commitment Hours / Effective Available Hours) × 100
```

If `Effective Available Hours ≤ 0` (person is fully on leave or in meetings all day), utilization is `∞` — flag as UNAVAILABLE rather than computing a percentage.

---

## 3. Calendar Event Classification

Calendar events during working hours either **reduce capacity** (meetings) or **don't** (focus blocks, personal time blocks that protect deep work time).

### 3.1 Classification Rules (evaluated in order — first match wins)

| # | Rule | Classification | Rationale |
|---|------|----------------|-----------|
| 1 | Event is **all-day** AND has **no attendees** | `IGNORE` | Likely OOO marker — handled by time-off layer, not calendar |
| 2 | Event is **all-day** AND has **attendees** | `MEETING` | All-day workshops, offsites, conferences |
| 3 | Event falls **outside working hours window** | `IGNORE` | Personal time — not relevant to work capacity |
| 4 | Event `transparency` = `"transparent"` (Google: "free") | `FOCUS_BLOCK` | User explicitly marked as available |
| 5 | Event has **≤ 1 attendee** (just the person) AND title matches **focus keywords** | `FOCUS_BLOCK` | Self-scheduled focus time |
| 6 | Event has **≤ 1 attendee** (just the person) AND title does **NOT** match focus keywords | `FOCUS_BLOCK` | Solo calendar blocks are almost always focus/personal time protection |
| 7 | Event has **≥ 2 attendees** | `MEETING` | Multi-person = meeting |

### 3.2 Focus Keywords (case-insensitive match)

```
focus, deep work, heads down, no meetings, block, do not book,
working time, maker time, focus time, personal, lunch, break,
admin time, prep time, planning time, writing time, coding
```

### 3.3 Meeting Keywords (case-insensitive, used for ambiguous cases in future ML classification)

```
sync, standup, stand-up, 1:1, one-on-one, review, planning,
retro, retrospective, interview, call, meeting, check-in,
workshop, demo, presentation, kickoff, all-hands, town hall
```

### 3.4 Duration Calculation

For events classified as `MEETING`:

- **Single events:** Use event duration directly (end time − start time), capped to working hours window
  - Example: A meeting from 4pm–6pm when working hours end at 5pm counts as 1 hour, not 2
- **Recurring events:** Expand all occurrences within the calculation period. Each occurrence counts independently
  - A weekly 1h standup = 4–5 meeting hours per month
- **Overlapping meetings:** Count the **union** of time, not the sum
  - Two meetings from 2pm–3pm count as 1 hour, not 2
  - A meeting from 2pm–4pm and another from 3pm–5pm count as 3 hours (2pm–5pm)

### 3.5 Calendar Data Source

Read from Google Calendar API via the existing calendar integration (`src/lib/integrations/calendar-events.ts`). Use the person's linked Google account.

**If no calendar is connected:** Meeting hours = 0. The person's full contract hours are considered available. This is stated in the UI: "Connect your calendar for accurate capacity data."

---

## 4. Task Effort Estimation

### 4.1 Estimation Hierarchy

For each task assigned to the person, determine effort in hours:

```
1. If task.estimatedHours is set and > 0  →  use task.estimatedHours
2. If task.points is set and > 0          →  use task.points × pointsMultiplier
3. Otherwise                              →  use priority default
```

### 4.2 Points Multiplier

The `points` field on the Task model uses a 0–100 scale (not classic 1/2/3/5/8 story points).

**Default mapping:** `pointsMultiplier = 0.4` (workspace-configurable via `OrgCapacitySettings`)

| Points | Estimated Hours | Rationale |
|--------|-----------------|-----------|
| 5 | 2h | Trivial task |
| 10 | 4h | Half day |
| 20 | 8h | Full day |
| 40 | 16h | 2 days |
| 60 | 24h | 3 days |
| 80 | 32h | 4 days |
| 100 | 40h | Full week |

This gives a reasonable effort curve. Teams that use points differently can adjust the multiplier.

### 4.3 Priority-Based Defaults

When neither `estimatedHours` nor `points` exist:

| Priority | Default Hours | Rationale |
|----------|---------------|-----------|
| `URGENT` | 4h | High urgency implies significant effort |
| `HIGH` | 4h | Substantial task |
| `MEDIUM` | 2h | Average task |
| `LOW` | 1h | Small task |
| `NONE` / unset | 2h | Assume medium if not prioritized |

These defaults are intentionally conservative — slightly overestimating is better than underestimating for capacity planning. They are workspace-configurable via `OrgCapacitySettings`.

### 4.4 Task Inclusion Rules

**Include** in capacity calculation:
- Tasks with status: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `BLOCKED`
- Tasks assigned to the person (via task assignee)
- Tasks with a due date within the calculation period, OR tasks with status `IN_PROGRESS`/`BLOCKED` that have no due date (assume they consume capacity in the current period)

**Exclude** from capacity calculation:
- Tasks with status: `DONE` — completed work no longer consumes capacity
- Subtasks — only count parent tasks to avoid double-counting (subtask effort is assumed included in parent estimate)
- Tasks assigned to the person but in a project with status `ON_HOLD` or `CANCELLED`

### 4.5 Task Temporal Distribution

When a task spans multiple weeks/periods:
- If `estimatedHours` or derived effort ≤ 8h → assign entirely to the week containing the due date (or current week if no due date)
- If effort > 8h → distribute evenly across the period from task creation/start to due date
  - Example: A 40h task created March 1 due March 28 → ~10h/week for 4 weeks

---

## 5. Time Off / Leave

### 5.1 Data Source

Read from `PersonAvailability` model and approved leave requests.

### 5.2 Calculation

- **Full day off:** Reduces capacity by `dailyHours` (contract weekly hours / working days count)
  - Default: 40 / 5 = 8 hours per full day
- **Partial day:** Pro-rate. A half day = 4 hours reduction
- **Only count working days:** Weekends and non-working days in the person's contract don't count as time off

### 5.3 All-Day Calendar Events as Time Off

All-day events with no attendees (Rule #1 in §3.1) are ignored by the calendar classification layer. However, if they match time-off keywords (`vacation`, `PTO`, `out of office`, `OOO`, `holiday`, `sick`, `leave`), they should be treated as time off IF no corresponding `PersonAvailability` record exists.

This prevents double-counting (a leave request AND a calendar block for the same day) while catching informal OOO markers.

---

## 6. Utilization Thresholds

Workspace-configurable via `OrgCapacitySettings`. Defaults:

| Status | Range | Meaning |
|--------|-------|---------|
| `OVERALLOCATED` | > 100% | More task hours than available hours — unsustainable |
| `AT_RISK` | 85–100% | Near capacity — any new work or unplanned meeting pushes over |
| `HEALTHY` | 40–84% | Good utilization — room for interrupts and unplanned work |
| `UNDERUTILIZED` | < 40% | Significantly below capacity — may need more work or contract review |
| `UNAVAILABLE` | Effective hours ≤ 0 | Fully on leave or meetings — no capacity for tasks |

### 6.1 Why 85% as the at-risk threshold

Knowledge workers typically lose 15–20% of their time to context switching, admin, Slack, email, and unplanned interrupts. A person at 85% task allocation has essentially zero buffer. This is well-documented in engineering management literature (e.g., "Peopleware", "The Mythical Man-Month") and aligns with industry practice (Atlassian recommends 70-80% allocation targets).

---

## 7. Rollup Rules

### 7.1 Team Capacity

```
Team Available Hours  = Σ member effective available hours
Team Committed Hours  = Σ member task commitment hours
Team Utilization %    = (Team Committed Hours / Team Available Hours) × 100
```

Team status uses the same thresholds as individual (§6), applied to the aggregate.

Additionally, flag **distribution issues**: a team at 70% aggregate utilization but where 2 of 5 members are over 100% has a distribution problem, not a capacity problem.

### 7.2 Department Capacity

Same as team, aggregated across all teams in the department.

### 7.3 Project Capacity View

For a project, capacity is the inverse view — how much of each assigned person's capacity does this project consume?

```
Project Capacity Demand = Σ (task hours for tasks in this project assigned to each person)
Per-Person Project Load = person's task hours on this project / person's effective available hours
```

This answers "how much of Sarah's time is Project Alpha consuming?" — which is distinct from "is Sarah overallocated overall?"

---

## 8. Calculation Period & Granularity

### 8.1 Stored Granularity

Compute and cache **weekly** snapshots in `PersonCapacity`:
- `weekStart` (Monday of the week)
- `contractHours` (from CapacityContract)
- `meetingHours` (from calendar)
- `timeOffHours` (from availability/leave)
- `effectiveHours` (contract − meetings − time off)
- `committedHours` (from tasks)
- `utilization` (committed / effective × 100)
- `status` (OVERALLOCATED / AT_RISK / HEALTHY / UNDERUTILIZED / UNAVAILABLE)

### 8.2 Display Granularity

| View | Aggregation |
|------|-------------|
| **Weekly** | Single week snapshot — primary view for sprint planning |
| **Monthly** | Sum of weekly snapshots in the month — primary view for capacity planning |
| **Quarterly** | Sum of monthly — strategic view |

### 8.3 Refresh Frequency

- **On-demand:** Recalculate when a user views capacity (if cached data is >1 hour stale)
- **Triggered:** Recalculate affected person(s) when: task assigned/unassigned, task hours/points changed, leave request approved/cancelled, capacity contract changed
- **Scheduled:** Nightly batch recalculation for all people (cron job) to catch calendar changes

---

## 9. Loopbrain Integration

This contract enables Loopbrain to answer:

| Question | Data Used |
|----------|-----------|
| "Who has bandwidth for this task?" | Effective available hours − committed hours, filtered by team/skills |
| "Is this team overcommitted for next sprint?" | Team rollup utilization for next week |
| "What happens to timelines if Sarah goes on leave?" | Recalculate capacity without Sarah → flag affected projects |
| "Why is this project behind?" | Per-person project load → identify overallocated contributors |
| "Show me capacity for Q2" | Quarterly rollup with week-by-week breakdown |

### 9.1 Loopbrain Context Source

The existing `context-sources/capacity.ts` (648L) should consume `PersonCapacity` weekly snapshots instead of computing on the fly. The snapshot provides pre-computed values that the LLM can reason about directly.

### 9.2 Issue Detection Integration

`deriveIssues.ts` capacity issue types should use this contract:

| Issue Type | Trigger |
|-----------|---------|
| `OVERALLOCATED_PERSON` | Person utilization > 100% for current or next week |
| `AT_RISK_PERSON` | Person utilization 85–100% for 2+ consecutive weeks |
| `UNDERUTILIZED_PERSON` | Person utilization < 40% for 2+ consecutive weeks |
| `TEAM_IMBALANCE` | Team aggregate < 85% but any member > 100% |
| `UNAVAILABLE_OWNER` | Project/decision domain owner is UNAVAILABLE status |

---

## 10. Schema Requirements

### 10.1 Existing Models (verify fields match)

- `CapacityContract` — needs: `weeklyHours`, `workingDays`, `personId`, `workspaceId`
- `PersonCapacity` — needs: weekly snapshot fields per §8.1
- `OrgCapacitySettings` — needs: `workingHoursStart`, `workingHoursEnd`, `pointsMultiplier`, threshold overrides
- `CapacityAllocation` — may be used for project-level percentage allocation (V2)

### 10.2 New Fields (if not present)

- `Task.estimatedHours` — `Float?` — explicit hour estimate
- `OrgCapacitySettings.pointsMultiplier` — `Float` default `0.4`
- `OrgCapacitySettings.defaultHoursUrgent` — `Float` default `4`
- `OrgCapacitySettings.defaultHoursHigh` — `Float` default `4`
- `OrgCapacitySettings.defaultHoursMedium` — `Float` default `2`
- `OrgCapacitySettings.defaultHoursLow` — `Float` default `1`
- `OrgCapacitySettings.thresholdOverallocated` — `Float` default `100`
- `OrgCapacitySettings.thresholdAtRisk` — `Float` default `85`
- `OrgCapacitySettings.thresholdUnderutilized` — `Float` default `40`

### 10.3 Task Model Note

The existing `Task.points` field uses a 0–100 scale. This contract does NOT change the points scale — it defines a multiplier to convert points to hours. If the team later wants classic story points (1/2/3/5/8/13), the multiplier can be adjusted or a mapping table introduced.

---

## 11. Implementation Priority

| Phase | Scope | Dependency |
|-------|-------|------------|
| **Phase 1** | Schema additions (`estimatedHours`, `OrgCapacitySettings` fields). Capacity calculation engine (contract hours → effective hours → utilization). Weekly snapshot computation and caching. | None |
| **Phase 2** | Calendar event classification and meeting hour extraction. Wire calendar data into effective hours calculation. | Google Calendar integration connected |
| **Phase 3** | Wire into `deriveIssues.ts` issue detection. Wire into Loopbrain `context-sources/capacity.ts`. | Phase 1 + 2 |
| **Phase 4** | Team/department rollups. Project capacity view. UI for capacity dashboard. | Phase 3 |

---

## Appendix A: Edge Cases

| Scenario | Handling |
|----------|----------|
| Person has no capacity contract | Use workspace defaults (40h/week, Mon–Fri) |
| Person has no calendar connected | Meeting hours = 0; full contract hours available |
| Person has no tasks assigned | Utilization = 0% (UNDERUTILIZED if persistent) |
| Task has no due date and is TODO | Exclude from capacity (not yet active) |
| Task has no due date and is IN_PROGRESS | Include in current week's capacity |
| Task assigned to multiple people | Currently not supported (Task has single assignee). If added later: split estimated hours equally or by allocation percentage |
| Recurring calendar event with exceptions | Use expanded occurrences from Google Calendar API (handles exceptions natively) |
| Person works different hours on different days | Not supported in V1. Use average daily hours from weekly contract. |
| Meeting overlaps with time off | Time off takes precedence — don't double-count |

---

*This contract is versioned. Breaking changes require a new version (v2.0). Additive changes (new fields, new issue types) can be added to v1.x.*
