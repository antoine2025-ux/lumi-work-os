# Org Center – Flows QA Checklist (L11)

This checklist focuses on **end-to-end flows** across Org Chart, Structure, and People — not just single-page visuals.

Use it when:
- You ship Org Center changes.
- You prepare for demos/investor reviews.
- You want to quickly validate that the "big picture" still works.

---

## 1. Create Team → See in Structure → See in People → See in Org Chart

### 1.1 Create a new team

1. Go to **Org → Structure → Teams tab**.
2. Click **New team**.
3. Fill in:
   - Team name: `L11 QA – Growth Team`
   - Department: choose an existing department (or leave empty).
   - Description: short sentence.
4. Click **Create team**.

**Expected:**

- [ ] A toast appears: "Team created – 'L11 QA – Growth Team' was added to your org."
- [ ] The team now appears in the Teams list (sorted as expected).

### 1.2 Jump to People for that team

1. In the Teams list, click the **team name link** for `L11 QA – Growth Team`.

**Expected:**

- [ ] You land on `/org/people?teamId=...` with:
  - Filter bar showing **Team = "L11 QA – Growth Team"**.
  - If no people exist yet, an empty state with "No people match this view" + "Invite people" CTA.

### 1.3 See team in Org Chart

1. Go to **Org → Org chart**.
2. Navigate/expand until you find the department or area where that team should appear.

**Expected:**

- [ ] A node for `L11 QA – Growth Team` exists.
- [ ] Hovering the node shows a tooltip (at minimum team name; later it can show lead, members, etc.).
- [ ] Clicking the team node takes you back to `/org/people?teamId=...`.

---

## 2. Create Department → Filter Teams → Navigate to People

### 2.1 Create a new department

1. Go to **Org → Structure → Departments tab**.
2. Click **New department**.
3. Fill in:
   - Department name: `L11 QA – Revenue Org`
   - Description: optional.
4. Click **Create department**.

**Expected:**

- [ ] Toast: "Department created – 'L11 QA – Revenue Org' was added to your org."
- [ ] The department appears in the departments list/cards.

### 2.2 Filter Teams by this department

1. Go to **Structure → Teams tab**.
2. Use the department filter (if available) or click the **department link** where this new department is referenced.

**Expected:**

- [ ] URL contains `?departmentId=...`.
- [ ] The Teams list is filtered to teams in `L11 QA – Revenue Org` (possibly empty if no teams yet).
- [ ] Header/filter bar clearly shows the active department.

### 2.3 Navigate from department → teams → people

1. From the **Departments tab**, click **View teams** (if that UX exists) or the department name link that leads to filtered Teams.
2. From the filtered Teams list, click a team name.

**Expected:**

- [ ] You land on `/org/people?teamId=...`.
- [ ] Filter bar shows correct team filter.

---

## 3. Create Role → See it in Structure → Filter People by role

### 3.1 Create a new role

1. Go to **Org → Structure → Roles tab**.
2. Click **New role**.
3. Fill in:
   - Role name: `L11 QA – IC Designer`
   - Level: e.g. `L3` (optional).
   - Description: optional summary.
4. Click **Create role**.

**Expected:**

- [ ] Toast: "Role created – 'L11 QA – IC Designer' was added to your org."
- [ ] New role appears in the roles table.

### 3.2 Filter people by that role

> This assumes you wire People filters to roles in L11 Steps 6–8.

1. Go to **Org → People**.
2. Use **Role filter** dropdown and select `L11 QA – IC Designer`.

**Expected:**

- [ ] URL contains `?roleId=...`.
- [ ] Filter bar shows Role chip.
- [ ] If no people assigned to this role, you see a clean empty state explaining that no people match this view.

---

## 4. People → Structure → Org Chart "round trip"

### 4.1 From a person to their team + department

1. Go to **Org → People**.
2. Pick a person with a team + department assigned.
3. Click on the **team name** in the table.

**Expected:**

- [ ] You land on `/org/structure?tab=teams&teamId=...`.
- [ ] Teams tab is active, and either:
  - The selected team is visually highlighted, or
  - The table is filtered to show that team.

4. Go back to **People**, click the **department name** for the same or another person.

**Expected:**

- [ ] You land on `/org/structure?tab=teams&departmentId=...`.
- [ ] Teams tab is filtered to the department.

### 4.2 From Structure to Org Chart

1. In **Structure → Teams**, locate a team.
2. Open **Org chart**.
3. Use expand/collapse to confirm you can find the same team.

**Expected:**

- [ ] Team names are consistent between Structure and Org chart.
- [ ] Clicking the team in Org Chart sends you to the same People filter as from Structure.

---

## 5. Permissions + Flows (Owner/Admin/Member)

Test a smaller version of these flows for different roles:

### 5.1 Owner

- [ ] Can create departments, teams, roles.
- [ ] Sees toasts for creation.
- [ ] Can navigate between Org Chart, Structure, People freely.

### 5.2 Admin

- [ ] Can create departments, teams, roles (depending on your permission model).
- [ ] Sees appropriate tabs and actions (no Danger zone if that's Owner-only).

### 5.3 Member

- [ ] Cannot create departments/teams/roles.
- [ ] Sees a read-only view of Org Chart, Structure, People (where allowed).
- [ ] Clicking links still works where they have permission; creation actions are hidden.

---

## 6. Quick Regression Checks

After completing the flows above, quickly check:

- [ ] Global Loopwell header appears and is consistent on all Org pages.
- [ ] Sidebar highlights the correct item on `/org`, `/org/people`, `/org/structure`, `/org/chart`, `/org/activity`, `/org/settings`.
- [ ] No console errors were seen during flows.
- [ ] No obvious layout jumps when moving between these pages.

---

## 7. Demos: Suggested "Storyline"

When demoing Org Center, a clean sequence is:

1. Start at **Org overview** → explain what the Org Center is.
2. Jump to **Org chart** → expand, show how clicking teams/departments navigates.
3. From Org chart → **People** (filtered by a team).
4. From People → **Structure** (team & department links).
5. In Structure → create a new **Team**, **Department**, or **Role** and show the success toast + refreshed data.
6. Return to Org chart to confirm that the new structure appears there.

This creates a coherent narrative:

> "We can see, navigate, and *shape* our organization from one place."

---

# NOTES

- This flows document is intentionally **short and scenario-based**, not as detailed as the full UX QA checklist.
- It's ideal for:
  - Pre-demo dry runs.
  - High-level regression checks after significant Org changes.
- As L12+ evolves permissions and analytics, you can add:
  - Flows for invite management.
  - Flows for viewing activity logs after structure changes.

# NEXT RECOMMENDED STEP

Next recommended step: Milestone L11 – Step 15: Do a **small polish batch** based on any issues found during Flows QA (micro copy fixes, minor layout tweaks, smoother loading states), and then summarize L11 outcomes + open items in a short internal recap doc.

