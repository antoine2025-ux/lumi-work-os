#!/usr/bin/env tsx
/**
 * Script to run org context sync directly (bypasses API authentication)
 * 
 * Usage: npx tsx scripts/diagnostic/run-org-sync.ts
 */

import { prisma } from '../../src/lib/db';
import { syncOrgContext } from '../../src/lib/context/org/syncOrgContext';
import { syncDepartmentContexts } from '../../src/lib/context/org/syncDepartmentContexts';
import { syncTeamContexts } from '../../src/lib/context/org/syncTeamContexts';
import { syncPersonContexts } from '../../src/lib/context/org/syncPersonContexts';
import { syncRoleContexts } from '../../src/lib/context/org/syncRoleContexts';

async function main() {
  console.log('🔄 Running Org Context Sync...\n');

  // Get first workspace for testing
  const workspace = await prisma.workspace.findFirst({
    select: { id: true, name: true }
  });

  if (!workspace) {
    console.error('❌ No workspace found in database');
    process.exit(1);
  }

  const workspaceId = workspace.id;
  console.log(`📦 Workspace: ${workspace.name} (${workspaceId})\n`);

  try {
    // Step 1: Sync org-level ContextItem
    console.log('1️⃣  Syncing org-level context...');
    const orgItem = await syncOrgContext(workspaceId);
    console.log(`   ✅ Org: ${orgItem.title}`);

    // Step 2: Sync department contexts
    console.log('2️⃣  Syncing department contexts...');
    const departmentItems = await syncDepartmentContexts(workspaceId);
    console.log(`   ✅ Departments: ${departmentItems.length}`);

    // Step 3: Sync team contexts
    console.log('3️⃣  Syncing team contexts...');
    const teamItems = await syncTeamContexts(workspaceId);
    console.log(`   ✅ Teams: ${teamItems.length}`);

    // Step 4: Sync person contexts
    console.log('4️⃣  Syncing person contexts...');
    const personItems = await syncPersonContexts(workspaceId);
    console.log(`   ✅ People: ${personItems.length}`);

    // Step 5: Sync role contexts
    console.log('5️⃣  Syncing role contexts...');
    const roleItems = await syncRoleContexts(workspaceId);
    console.log(`   ✅ Roles: ${roleItems.length}`);

    console.log('\n✅ Sync completed successfully!');
    console.log(`📊 Total ContextItems created/updated: ${1 + departmentItems.length + teamItems.length + personItems.length + roleItems.length}`);

    // Verify sync by checking ContextItem counts
    console.log('\n🔍 Verifying sync...');
    const contextItemCounts = await prisma.contextItem.groupBy({
      by: ['type'],
      where: {
        workspaceId,
        type: { in: ['org', 'person', 'team', 'department', 'role'] }
      },
      _count: { _all: true }
    });

    console.log('✅ ContextItems by type:');
    contextItemCounts.forEach(item => {
      console.log(`  - ${item.type}: ${item._count._all}`);
    });

  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
