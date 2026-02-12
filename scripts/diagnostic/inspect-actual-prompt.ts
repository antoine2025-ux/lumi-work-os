#!/usr/bin/env tsx
/**
 * Inspect the actual prompt being sent to the LLM
 */

import { buildOrgPromptContext, buildOrgContextText } from '../../src/lib/loopbrain/orgPromptContextBuilder';

async function main() {
  console.log('🔍 Inspecting actual prompt content...\n');

  const { prisma } = await import('../../src/lib/db');
  
  const workspace = await prisma.workspace.findFirst({
    select: { id: true, name: true }
  });

  if (!workspace) {
    console.error('❌ No workspace found');
    process.exit(1);
  }

  console.log(`📦 Workspace: ${workspace.name} (${workspace.id})\n`);

  // Build the org context as it's used in orchestrator
  const orgPromptContext = await buildOrgPromptContext(workspace.id);
  
  console.log('📊 orgPromptContext structure:');
  console.log(`  - org: ${orgPromptContext.org ? 'present' : 'missing'}`);
  console.log(`  - people: ${orgPromptContext.people.length}`);
  console.log(`  - teams: ${orgPromptContext.teams.length}`);
  console.log(`  - departments: ${orgPromptContext.departments.length}`);
  console.log(`  - roles: ${orgPromptContext.roles.length}\n`);

  // Show sample person data
  if (orgPromptContext.people.length > 0) {
    console.log('👤 Sample person:');
    const person = orgPromptContext.people[0];
    console.log(`  title: ${person.title}`);
    console.log(`  summary: ${person.summary}`);
    console.log(`  tags: ${JSON.stringify(person.tags)}`);
    console.log(`  relations: ${JSON.stringify(person.relations)}\n`);
  }

  // Show sample role data
  if (orgPromptContext.roles.length > 0) {
    console.log('🎭 Sample role:');
    const role = orgPromptContext.roles[0];
    console.log(`  title: ${role.title}`);
    console.log(`  summary: ${role.summary}`);
    console.log(`  tags: ${JSON.stringify(role.tags)}`);
    console.log(`  relations: ${JSON.stringify(role.relations)}\n`);
  }

  // Build the text context as it's sent to LLM
  const contextText = buildOrgContextText(orgPromptContext, {
    maxPeople: 20,
    maxTeams: 15,
    maxDepartments: 10,
    maxRoles: 10,
  });

  console.log('\n' + '='.repeat(80));
  console.log('📝 ACTUAL PROMPT CONTEXT TEXT SENT TO LLM:');
  console.log('='.repeat(80));
  console.log(contextText);
  console.log('='.repeat(80) + '\n');

  console.log(`📏 Context length: ${contextText.length} chars\n`);

  await prisma.$disconnect();
}

main().catch(console.error);
