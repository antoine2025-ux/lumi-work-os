# Org Center – L11 Plan (ARCHIVED)

*This milestone is complete. See `org-center-l11-recap.md` for final summary.*

> Status: Archived after Step 16. No further changes should be made here.

---

# Org Center – L11 Feature Improvements (Planning Document)

This document outlines the high-impact functional UX improvements planned for Milestone L11.  
The goal is to evolve Org Center from "aligned and polished" → "interactive and powerful".

---

# 1. Priority Areas Identified

Based on UX QA, roadmap discussions, and product strategy, the highest-impact areas are:

## 1.1 Interactive Org Chart (v2)

The Org Chart currently displays structure but does not allow interaction.  
We plan to add:

- Expand/collapse behavior for departments and teams.

- Click-on-team → highlight related people.

- Hover states for clarity.

- Scalable layout for large orgs.

- Ability to navigate to People or Structure from nodes.

**Outcome:** Org chart becomes useful for navigation, not just visualization.

---

## 1.2 People Directory – Filters & Sorting

Current People page is functional but limited.

We will add:

- Filter by team.

- Filter by department.

- Filter by role.

- Sort by name or join date.

- Clear filters in one click.

**Outcome:** Faster navigation, better insights into org composition.

---

## 1.3 Structure Editing UX (Teams / Departments / Roles)

We will improve edit/create flows with:

- Modal or drawer-based "Create Team / Department / Role".

- Inline validation (required fields, duplicates).

- Unified form patterns.

**Status:**

- Create Team: modal UX + backend wiring implemented (L11 – Steps 9–10).

- Create Department: modal UX shell implemented (L11 – Step 11), ready for mutation wiring.

- Create Role: modal UX shell implemented (L11 – Step 11), ready for mutation wiring.

**Outcome:** Creating and modifying structure becomes smooth and intuitive.

---

## 1.4 Deepen Page Interactions

To improve day-to-day UX:

- Click a team → view filtered People list.

- Click a department → view filtered Teams.

- Click a role → view People with that role.

- Inline breadcrumbs back to Structure tabs.

**Outcome:** More natural movement between Structure ↔ People ↔ Chart.

---

## 1.5 Consistent Loading States (Org-wide)

Standardize:

- Skeleton shapes.

- Layout transitions.

- Delayed spinner usage only when needed.

**Outcome:** Removes UX jitter and ensures predictable loads.

---

# 2. Proposed Order of Execution (Implementation Plan)

1. **Org Chart Interactive Layer (L11–Step 2 → Step 5)**  

   - Expand/collapse  

   - Node click interactions  

   - Navigation hooks  

2. **People Directory Filters (L11–Step 6 → Step 8)**  

   - Query params for filters  

   - Shared filter bar  

   - Sorting  

3. **Structure Editing (L11–Step 9 → Step 12)**  

   - Create/edit modals  

   - UX validation  

   - Route integration  

4. **Cross-page linking (L11–Step 13 → Step 14)**  

   - Team → filtered People  

   - Department → filtered Teams  

   - Role → filtered People  

5. **Final polish pass (L11–Step 15)**  

   - Consistent loading  

   - Interaction timing  

   - Visual tuning  

---

# 3. Non-goals for L11

We explicitly **exclude** the following to keep scope healthy:

- No back-end-heavy analytics (belongs to L13).  

- No redesign of the Flowbrain → Org integration yet.  

- No advanced permission management overhaul (L12).  

- No drag-and-drop org chart editing.

These require deeper planning or architectural changes.

---

# 4. Success Criteria

L11 is complete when:

- Org Chart is interactive and helps navigate the org.

- People directory supports filtering and sorting.

- Structure editing uses a clean, modern, modal-based UX.

- Moving between Org pages feels interconnected.

- All loading and transition states are smooth and unified.

---

# NEXT STEPS

Proceed to L11 – Step 2: Implement the **Interactive Org Chart foundation** (expand/collapse architecture + visual state model).

