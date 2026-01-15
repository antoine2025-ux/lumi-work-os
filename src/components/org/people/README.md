# People Directory & Profile Components

This directory contains components for the Org People feature.

## Component Overview

- **`PeopleDirectory.tsx`** - Master list view with search and filters
- **`PersonPanel.tsx`** - Detail view component (currently used in directory)
- **`RoleCard.tsx`** - Premium identity card component (Slack-style)
- **`EditProfileForm.tsx`** - Edit profile form component

## Profile Data Contract

See `src/server/org/people/profile-contract.md` for the canonical Person Profile data contract.

## Current State

- Directory shows workspace-scoped people list
- Profile panel displays basic identity and org context
- Edit form supports: title, availability, department, teams, skills, notes
- Profile override table (`OrgPersonProfileOverride`) stores org-specific fields

## Future Implementation

The profile contract defines a richer structure that should be implemented gradually:

1. **Identity** - ✅ Implemented (basic)
2. **Org Placement** - ✅ Implemented (department, teams, role)
3. **Relationships** - 🔄 Partial (manager exists in schema, not yet displayed)
4. **Availability** - ✅ Implemented (status only)
5. **Capacity** - ⏳ Schema exists, contract defined, UI pending
6. **Skills** - ✅ Implemented (basic array)
7. **Ownership** - ⏳ Schema exists, contract defined, UI pending
8. **Health** - ⏳ Contract defined, implementation pending
9. **Notes** - ✅ Implemented

## UI Presentation Order

Per the contract, profiles should render in this order:

1. Header (Identity)
2. Status & Context
3. Org Context (People)
4. Skills
5. Ownership
6. Health
7. Notes

