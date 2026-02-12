#!/usr/bin/env tsx
/**
 * Inspect what context is actually being loaded by Loopbrain
 */

import { prisma } from '../../src/lib/db';
import { getOrgContextForLoopbrain } from '../../src/lib/loopbrain/orgContextForLoopbrain';
import { buildOrgPromptContext } from '../../src/lib/loopbrain/orgPromptContextBuilder';

async function main() {
  console.log('🔍 Inspecting Loaded Org Context...\n');

  const workspace = await prisma.workspace.findFirst({
    select: { id: true, name: true }
  });

  if (!workspace) {
    console.error('❌ No workspace found');
    process.exit(1);
  }

  const workspaceId = workspace.id;
  console.log(`📦 Workspace: ${workspace.name} (${workspaceId})\n`);

  // Step 1: Check raw ContextItems
  console.log('1️⃣  RAW CONTEXT ITEMS FROM DATABASE\n');
  const items = await prisma.contextItem.findMany({
    where: {
      workspaceId,
      type: { in: ['org', 'person', 'team', 'department', 'role'] }
    },
    select: {
      id: true,
      contextId: true,
      type: true,
      title: true,
      summary: true,
      data: true,
      updatedAt: true,
    },
  });

  console.log(`Found ${items.length} items:`);
  items.forEach(item => {
    console.log(`  - [${item.type}] ${item.title}`);
    console.log(`    contextId: ${item.contextId}`);
    console.log(`    summary: ${item.summary?.substring(0, 80) || 'null'}`);
    console.log(`    data keys: ${Object.keys(item.data as any).join(', ')}`);
    console.log();
  });

  // Step 2: Check what getOrgContextForLoopbrain returns
  console.log('2️⃣  AFTER getOrgContextForLoopbrain()\n');
  const bundle = await getOrgContextForLoopbrain(workspaceId);
  
  console.log(`Org: ${bundle.org ? bundle.org.title : 'null'}`);
  console.log(`Related items: ${bundle.related.length}`);
  console.log(`ById keys: ${Object.keys(bundle.byId).length}\n`);

  if (bundle.org) {
    console.log('Org object:');
    console.log(`  id: ${bundle.org.id}`);
    console.log(`  type: ${bundle.org.type}`);
    console.log(`  title: ${bundle.org.title}`);
    console.log(`  summary: ${bundle.org.summary.substring(0, 80)}`);
    console.log(`  tags: ${bundle.org.tags.length}`);
    console.log(`  relations: ${bundle.org.relations.length}`);
    console.log();
  }

  console.log('Related items:');
  bundle.related.forEach(ctx => {
    console.log(`  - [${ctx.type}] ${ctx.title} (id: ${ctx.id})`);
  });
  console.log();

  // Step 3: Check buildOrgPromptContext
  console.log('3️⃣  AFTER buildOrgPromptContext()\n');
  const promptContext = await buildOrgPromptContext(workspaceId);
  
  console.log(`Org: ${promptContext.org ? promptContext.org.title : 'null'}`);
  console.log(`People: ${promptContext.people.length}`);
  console.log(`Teams: ${promptContext.teams.length}`);
  console.log(`Departments: ${promptContext.departments.length}`);
  console.log(`Roles: ${promptContext.roles.length}\n`);

  if (promptContext.people.length > 0) {
    console.log('People:');
    promptContext.people.forEach(person => {
      console.log(`  - ${person.title} (${person.id})`);
      console.log(`    summary: ${person.summary.substring(0, 100)}`);
    });
    console.log();
  }

  if (promptContext.teams.length > 0) {
    console.log('Teams:');
    promptContext.teams.forEach(team => {
      console.log(`  - ${team.title} (${team.id})`);
    });
    console.log();
  }

  await prisma.$disconnect();
}

main().catch(console.error);
