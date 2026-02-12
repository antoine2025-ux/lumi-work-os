#!/usr/bin/env tsx
/**
 * Diagnostic script to check org data in Prisma vs ContextItem table
 * 
 * Usage: npx tsx scripts/diagnostic/check-org-data.ts
 */

import { prisma } from '../../src/lib/db';

async function main() {
  console.log('🔍 Checking Org Data in Database...\n');

  // Get first workspace for testing
  const workspace = await prisma.workspace.findFirst({
    select: { id: true, name: true }
  });

  if (!workspace) {
    console.error('❌ No workspace found in database');
    process.exit(1);
  }

  console.log(`📦 Workspace: ${workspace.name} (${workspace.id})\n`);

  // Check OrgPosition count
  const orgPositionCount = await prisma.orgPosition.count({
    where: { workspaceId: workspace.id, isActive: true }
  });
  console.log(`✅ Active OrgPositions: ${orgPositionCount}`);

  // Check OrgTeam count
  const orgTeamCount = await prisma.orgTeam.count({
    where: { workspaceId: workspace.id, isActive: true }
  });
  console.log(`✅ Active OrgTeams: ${orgTeamCount}`);

  // Check OrgDepartment count
  const orgDepartmentCount = await prisma.orgDepartment.count({
    where: { workspaceId: workspace.id, isActive: true }
  });
  console.log(`✅ Active OrgDepartments: ${orgDepartmentCount}`);

  // Sample positions (show first 5)
  if (orgPositionCount > 0) {
    console.log('\n📋 Sample OrgPositions:');
    const samplePositions = await prisma.orgPosition.findMany({
      where: { workspaceId: workspace.id, isActive: true },
      include: {
        user: { select: { name: true, email: true } },
        team: { select: { name: true } }
      },
      take: 5
    });
    
    samplePositions.forEach(pos => {
      console.log(`  - ${pos.title || 'Untitled'} | ${pos.user?.name || 'Vacant'} | Team: ${pos.team?.name || 'None'}`);
    });
  }

  console.log('\n🔍 Checking ContextItem Table...\n');

  // Check ContextItem count for org types
  const contextItemCounts = await prisma.contextItem.groupBy({
    by: ['type'],
    where: {
      workspaceId: workspace.id,
      type: { in: ['org', 'person', 'team', 'department', 'role'] }
    },
    _count: { _all: true }
  });

  if (contextItemCounts.length === 0) {
    console.log('❌ No org-related ContextItems found!');
    console.log('   This means Loopbrain has NO org data.');
    console.log('   You need to run the sync process.');
  } else {
    console.log('✅ ContextItems by type:');
    contextItemCounts.forEach(item => {
      console.log(`  - ${item.type}: ${item._count._all}`);
    });
  }

  // Check most recent ContextItems
  const recentContextItems = await prisma.contextItem.findMany({
    where: {
      workspaceId: workspace.id,
      type: { in: ['org', 'person', 'team', 'department', 'role'] }
    },
    select: {
      id: true,
      type: true,
      contextId: true,
      title: true,
      updatedAt: true
    },
    orderBy: { updatedAt: 'desc' },
    take: 10
  });

  if (recentContextItems.length > 0) {
    console.log('\n📋 Recent ContextItems:');
    recentContextItems.forEach(item => {
      console.log(`  - [${item.type}] ${item.title} (updated: ${item.updatedAt.toISOString()})`);
    });
  }

  console.log('\n📊 Summary:');
  console.log(`  Prisma Org Data: ${orgPositionCount + orgTeamCount + orgDepartmentCount} records`);
  console.log(`  ContextItems: ${contextItemCounts.reduce((sum, item) => sum + item._count._all, 0)} records`);
  
  if (contextItemCounts.length === 0 && (orgPositionCount > 0 || orgTeamCount > 0 || orgDepartmentCount > 0)) {
    console.log('\n⚠️  SYNC REQUIRED!');
    console.log('   Run: POST /api/loopbrain/org/context/sync');
    console.log('   Or use the OrgContextSyncButton in the UI');
  } else if (contextItemCounts.length > 0) {
    console.log('\n✅ Sync appears to have run successfully');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
