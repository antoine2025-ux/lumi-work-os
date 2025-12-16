# Org Golden Path Checklist

## Purpose
This checklist validates that Org v1.1 answers key questions deterministically through a complete end-to-end scenario.

## Golden Path Scenario (must pass)

### Setup
1. **Create a Project "Payments Migration"**
   - Navigate to `/org/projects`
   - Click "Add project" or use seed data
   - Name: "Payments Migration"
   - Description: "Migrate payment processing to new infrastructure"

   **Expected:**
   - Project appears in list
   - Project has no accountability initially

---

2. **Set Accountability:**
   - Owner = Product Manager (role)
   - Decision = Engineering Manager (role)
   - Escalation = Sam (person)
   - (Optional v1.1) Backup owner/decision set

   **Steps:**
   - Click "Edit accountability" on the project
   - Set Owner to "Role: Product Manager"
   - Set Decision authority to "Role: Engineering Manager"
   - Set Escalation to "Person: Sam"
   - (v1.1) Set Backup owner to "Person: Alex"
   - Click "Save"

   **Expected:**
   - Accountability panel shows:
     - Owner: Product Manager (with "View role responsibilities" link)
     - Decision authority: Engineering Manager (with link)
     - Escalation: Sam
     - (v1.1) Coverage section shows Backup owner: Alex
   - Status pill shows "Complete" (if owner + decision are set)
   - Debug Q&A section (if enabled) shows:
     - Owner: Product Manager
     - Decision: Engineering Manager
     - Escalation: Sam
     - Coverage: Alex (backup owner)

   **Questions answered:**
   - ✅ Q1: Who owns this? → Product Manager (role)
   - ✅ Q2: Who decides this? → Engineering Manager (role)
   - ✅ Q3: Who escalates? → Sam (person)

---

### People modeling
3. **Add person "Dana"**
   - Navigate to `/org/people`
   - Click "Add person" or use seed data
   - Name: "Dana"
   - Email: "dana.ic@loopwell.demo"
   - Leave manager unset intentionally

   **Expected:**
   - Person appears in people list
   - Org allows incomplete reporting line (no red warnings)
   - Issues view (if implemented) detects missing manager (derived, not enforced)

---

4. **Place Dana in team "Payments" (optional)**
   - Edit Dana's position
   - Set team to "Payments" (or create team if needed)

   **Expected:**
   - Team assignment is optional
   - No enforcement of completeness

---

### Availability
5. **Record Dana as unavailable until a date**
   - Navigate to `/org/people`
   - Click on Dana's card
   - Click "Edit"
   - In "Availability" section, click "Add time off / partial availability"
   - Type: Unavailable
   - Start date: Today
   - End date: +7 days from today
   - Note: "Vacation"
   - Save

   **Expected:**
   - People card shows "Unavailable" badge
   - Availability section lists the window
   - "When do they return?" returns endDate
   - ✅ Q5: Who is unavailable and when? → Dana, returns [endDate]

---

### Allocations
6. **Allocate Alex and Sam to project with fractions**
   - Navigate to `/org/people`
   - Click on Alex's card
   - Click "Edit"
   - In "Allocations" section, click "Add allocation"
   - Project: Payments Migration
   - Fraction: 0.6 (60%)
   - Start date: Today
   - Save
   - Repeat for Sam: 0.4 (40%)

   **Expected:**
   - People cards show capacity badges:
     - Alex: Capacity: 40% (assuming 100% base - 60% allocated)
     - Sam: Capacity: 60% (assuming 100% base - 40% allocated)
   - Project page shows "Allocated people" section:
     - Alex (60%)
     - Sam (40%)
   - Capacity badges update immediately after save (no page reload needed)

   **Questions answered:**
   - ✅ Q4: Do we have capacity at all? → Yes (structural: 100% total allocated across people)

---

### Capacity rollups
7. **View Team capacity table**
   - Navigate to `/org/people`
   - Open Utilities drawer (if collapsed)
   - Expand "Capacity" section

   **Expected:**
   - Capacity Strip shows:
     - Average capacity: ~66% (if Alex 40%, Sam 60%, Dana unavailable = 0%)
     - Overallocated count: 0 (if no one exceeds 100%)
   - Team Capacity Table shows:
     - Team, headcount, avg capacity, unavailable count, overallocated count
     - Data is deterministic and stable (same inputs = same outputs)

---

### Role semantics (if roles catalog enabled)
8. **Verify role responsibilities exist or show Unknown without breaking UX**
   - Navigate to `/org/roles`
   - Verify "Product Manager" and "Engineering Manager" roles exist
   - Click on a role to view responsibilities

   **Expected:**
   - Roles list shows responsibility counts
   - No red warnings if roles are missing
   - Alignment labels are calm and descriptive
   - "View role responsibilities" links work from project accountability panel

---

### Final questions (must answer deterministically)

| Question | Org Answer | Status |
|----------|-----------|--------|
| Q1: Who owns this? | Product Manager (role) | ✅ |
| Q2: Who decides this? | Engineering Manager (role) | ✅ |
| Q3: Who escalates? | Sam (person) | ✅ |
| Q4: Do we have capacity at all? | Yes (structural: allocations sum to 100%) | ✅ |
| Q5: Who is unavailable and when? | Dana, returns [endDate] | ✅ |
| Q6: Who can cover? | Alex (backup owner, v1.1) | ✅ (v1.1) |
| Q8: Is responsibility fragmented? | No (owner + decision set) | ✅ |

---

## Blockers
If any of these fail, stop and fix:

- ❌ **Add person does not create a person**
  - Check API endpoint `/api/org/people` POST
  - Check form submission handler

- ❌ **Save accountability does not persist**
  - Check API endpoint `/api/org/projects/[projectId]/accountability` PUT
  - Check drawer save handler
  - Verify Prisma upsert succeeds

- ❌ **Save availability does not persist**
  - Check API endpoint `/api/org/people/[id]/availability` POST
  - Check drawer save handler
  - Verify person card updates after save

- ❌ **Save allocation does not persist**
  - Check API endpoint `/api/org/people/[id]/allocations` POST
  - Check drawer save handler
  - Verify capacity badge updates after save

- ❌ **Derived views do not update after edits**
  - Check state management in people/projects pages
  - Ensure `fetchProjects()` / `fetchPeople()` called after saves
  - Verify no stale cache

---

## Running the Seed Script

To populate the golden path scenario automatically:

```bash
# Set environment variable to enable golden path seed
SEED_GOLDEN_PATH=true npm run seed

# Or run the golden path seed directly
ts-node prisma/seed/org_golden_path.ts
```

This will create:
- Org: "Loopwell Demo Org"
- Roles: Product Manager, Engineering Manager
- People: Alex, Sam, Dana
- Project: Payments Migration
- Accountability: Owner=PM role, Decision=EM role, Escalation=Sam, Backup=Alex
- Availability: Dana unavailable for 7 days
- Allocations: Alex 60%, Sam 40%

---

## Verification Steps

1. **Manual walkthrough:**
   - Follow checklist steps 1-8 above
   - Verify each expected outcome
   - Document any failures

2. **Automated seed:**
   - Run seed script
   - Navigate to `/org/projects` and `/org/people`
   - Verify all data appears correctly
   - Test editing accountability, availability, allocations

3. **Debug Q&A (if enabled):**
   - Set `NEXT_PUBLIC_ORG_DEBUG_QA=true` in `.env.local`
   - Navigate to project page
   - Verify Q&A section shows correct answers

---

## Success Criteria

✅ All 8 checklist steps pass  
✅ All 7 questions answered deterministically  
✅ No blockers encountered  
✅ State updates work without page reload  
✅ Derived views are consistent and stable

---

## Notes

- This checklist validates Org as a **context substrate**
- Org does not make recommendations or optimize
- Missing data is meaningful (not an error)
- Derived views are deterministic (same inputs = same outputs)

