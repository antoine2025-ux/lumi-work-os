# Org Center – Post-Launch Review Playbook (L22)

This document describes how to use Org Center's usage tracking and feedback to drive continuous improvement.

---

## 1. Weekly Review Ritual (30–45 minutes)

Every week, do the following:

### 1.1 Usage patterns

- [ ] Query `OrgAuditLog` for `action = "ORG_CENTER_PAGE_VIEW"`.
- [ ] Group by:
  - `entityId` (route)
  - `metadata.name`
- [ ] Look for:
  - Most visited pages (Overview, People, Structure, Insights, Activity).
  - Pages that are almost never visited.

Use this to decide:
- Where to invest UX polish.
- Which pages might need better navigation or explanation.

### 1.2 Feedback review

- [ ] Query `OrgAuditLog` for `action = "ORG_CENTER_FEEDBACK"`.
- [ ] Read `metadata.meta.text` for all events in the last week.
- [ ] Tag each feedback item as:
  - UX confusion
  - Missing capability
  - Bug report
  - Request / idea

Summarize in a short note and feed into backlog.

---

## 2. Monthly Review (60 minutes)

### 2.1 Permissions & roles

- [ ] Review events related to role changes:
  - `MEMBER_CUSTOM_ROLE_UPDATED`
- [ ] Confirm:
  - No unexpected spikes in role changes.
  - Admin/Owner usage of custom roles is understandable.

### 2.2 Insights usage

- [ ] Filter page views for `/org/insights` (check `entityId`).
- [ ] Check if:
  - Owners/Admins are opening Insights after launch.
  - People drop off after first visit (low repeat visits).

If low usage:
- Add better surfacing on Overview.
- Improve the "Org insights" copy.

---

## 3. Alerting & Monitoring (manual, for now)

Even without a full monitoring stack, you can:

- [ ] Log `org_api_hit` from `recordOrgApiHit` to your log aggregator.
- [ ] Set up simple alerts for:
  - Spike in 5xx for `/api/org/**`.
  - Spike in 4xx for `/api/org/insights` or `/api/org/custom-roles`.

---

## 4. Deciding on Improvements

Whenever you plan a new Org Center iteration, ask:

1. What did real users **actually do** in Org Center?
2. What did they **complain about** or find confusing?
3. What part of the Org Center **we assumed is important** but nobody uses?

Then:

- Turn insights into **1–3 concrete improvements**.
- Avoid adding too many new surfaces at once.
- Use L-style milestones (L23, L24…) as small, focused iterations.

---

## 5. When to consider "Org Center v2"

Once you see stable real-world usage for a while:

- [ ] Most users are productive with People & Structure.
- [ ] Role model and custom roles are understood.
- [ ] Activity and Insights are providing value.

Then you can:

- Draft an **Org Center v2** roadmap focusing on:
  - Deeper analytics
  - Advanced automations
  - Cross-Org features
  - Integrations with Spaces / Loopbrain

---

## 6. Example Queries

### Page view counts by route

```sql
SELECT 
  entityId as route,
  COUNT(*) as view_count
FROM org_audit_logs
WHERE action = 'ORG_CENTER_PAGE_VIEW'
  AND createdAt >= NOW() - INTERVAL '7 days'
GROUP BY entityId
ORDER BY view_count DESC;
```

### Feedback in last week

```sql
SELECT 
  metadata->>'meta'->>'text' as feedback_text,
  metadata->>'route' as page,
  createdAt
FROM org_audit_logs
WHERE action = 'ORG_CENTER_FEEDBACK'
  AND createdAt >= NOW() - INTERVAL '7 days'
ORDER BY createdAt DESC;
```

### Most active orgs

```sql
SELECT 
  workspaceId,
  COUNT(*) as event_count
FROM org_audit_logs
WHERE action LIKE 'ORG_CENTER_%'
  AND createdAt >= NOW() - INTERVAL '30 days'
GROUP BY workspaceId
ORDER BY event_count DESC
LIMIT 10;
```

---

# NOTES

- L22 intentionally keeps monitoring **lightweight**:
  - No heavy BI / metrics stack assumed.
  - Uses existing audit-style logging and simple client hooks.
- Usage and feedback tracking is **best-effort** and **non-blocking**:
  - App never breaks if tracking fails.
- The real value is the **process**:
  - Weekly review
  - Monthly review
  - Continuous iteration based on real user behavior.

---

# NEXT RECOMMENDED STEP

Next recommended step: **Milestone L23 – Data-Informed Org Center Enhancements**, where we:

- Take real usage + feedback from L22
- Choose 2–3 high-impact UX or capability improvements
- Implement them as focused, incremental upgrades (not a giant redesign).

