# Org Phases (Non-negotiable)

These phases define the sequential progression of Org module development. **Skipping phases is not allowed.**

---

## Phase 0 (DONE): Stabilization

**Goal**: Stop breakage, allow iteration, tolerate temporary defensive patterns

**Status**: ✅ Completed

**What Was Done**:
- Feature flags added for incomplete features
- Defensive code patterns documented (but tolerated)
- ID usage documented (temporary aliasing)
- Migration verification script created

---

## Phase 1 (NOW): Schema Truth + ID Cleanup

**Goal**: Enforce `workspaceId` everywhere, remove legacy patterns, ensure schema completeness

**Status**: 🔄 In Progress

### Required Work

1. **ID Cleanup**
   - [ ] Remove all `orgId` parameters from Org APIs
   - [ ] Rename `requireActiveOrgId()` to `requireActiveWorkspaceId()` or use canonical helper
   - [ ] Remove type aliases equating `OrgId = WorkspaceId`
   - [ ] Update all function signatures to use `workspaceId` explicitly

2. **Schema Verification**
   - [ ] Run migration verification script
   - [ ] Ensure all required tables exist
   - [ ] Remove defensive fallback code once tables verified
   - [ ] Feature flags control rollout, not schema masking

3. **Auth Pattern Enforcement**
   - [ ] Convert all routes to use canonical auth pattern
   - [ ] Use `requireOrgContext()` helper where applicable
   - [ ] Verify `assertAccess` called on every route
   - [ ] Verify `setWorkspaceContext` called on every route

4. **Server Actions Removal**
   - [ ] Identify any Server Actions in Org paths
   - [ ] Convert to Route Handlers
   - [ ] Update UI to call API routes instead

5. **Deprecated Model References**
   - [ ] Audit codebase for `Org`, `OrgMembership`, legacy `SavedView` usage
   - [ ] Remove or update references
   - [ ] Add eslint rules if needed to prevent reintroduction

### Success Criteria

- ✅ All Org routes use `workspaceId` only
- ✅ All routes follow canonical auth pattern
- ✅ No defensive code masking missing tables
- ✅ No Server Actions in Org paths
- ✅ No deprecated model references
- ✅ `npm run org:scan` passes

---

## Phase 2: Core Org Value

**Goal**: Deliver core Org capabilities with real data

**Status**: 📋 Planned

### Planned Work

1. **Capacity Management**
   - Implement capacity calculations
   - Team capacity rollups
   - Allocation tracking
   - Visualization

2. **Ownership Coverage**
   - Complete ownership assignments
   - Coverage metrics
   - Health signals
   - Reports

3. **Management Load**
   - Span of control metrics
   - Overload detection
   - Manager hierarchy visualization

4. **People ↔ Teams ↔ Roles Integrity**
   - Ensure all relationships bidirectional
   - Relationship validation
   - Integrity health checks

5. **Org Chart Completion**
   - Display people in chart
   - Manager relationships
   - Hierarchy visualization

### Success Criteria

- ✅ Capacity calculations accurate
- ✅ Ownership assignments complete
- ✅ Management load metrics visible
- ✅ Org chart shows full structure
- ✅ All health signals generating

---

## Phase 3: Intelligence

**Goal**: Add derived insights, warnings, and executive-level signals

**Status**: 📋 Planned

### Planned Work

1. **Derived Insights**
   - Capacity trends
   - Ownership coverage trends
   - Structural balance metrics
   - Management load analysis

2. **Warning System**
   - Unowned entities alerts
   - Over-allocation warnings
   - Management overload alerts
   - Structural imbalance warnings

3. **Executive Signals**
   - High-level health dashboard
   - Risk indicators
   - Capacity forecasts
   - Actionable insights

4. **Advanced Features**
   - Org change history
   - What-if scenarios
   - Capacity planning
   - Reorg simulation

### Success Criteria

- ✅ Insights generating automatically
- ✅ Warnings actionable
- ✅ Executive dashboard complete
- ✅ Advanced features working

---

## Phase Discipline Rules

1. **No Skipping**: Must complete Phase 1 before Phase 2, Phase 2 before Phase 3
2. **Gate Criteria**: Each phase has success criteria that must be met
3. **Documentation**: Phase completion must be documented
4. **Verification**: `npm run org:scan` must pass before moving to next phase

---

**Current Phase**: Phase 1 (Schema Truth + ID Cleanup)
**Next Milestone**: Complete ID cleanup and auth pattern enforcement

