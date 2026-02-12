#!/usr/bin/env tsx
/**
 * Test the full chat orchestrator with logging to trace data flow
 */

import { runLoopbrainQuery } from '../../src/lib/loopbrain/orchestrator';

async function main() {
  console.log('🧪 Testing Chat Orchestrator with Org Question...\n');

  // Get workspace and user for testing
  const { prisma } = await import('../../src/lib/db');
  
  const workspace = await prisma.workspace.findFirst({
    select: { id: true, name: true }
  });

  if (!workspace) {
    console.error('❌ No workspace found');
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    select: { id: true, name: true, email: true }
  });

  if (!user) {
    console.error('❌ No user found');
    process.exit(1);
  }

  console.log(`📦 Testing as: ${user.name} (${user.id})`);
  console.log(`📦 Workspace: ${workspace.name} (${workspace.id})\n`);

  // Test org questions
  const testQuestions = [
    'Who is the CEO?',
    'Are you able to tell me who reports to who and who do we have in the organisation',
  ];

  for (const question of testQuestions) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`❓ Question: "${question}"`);
    console.log('='.repeat(80));
    console.log();

    try {
      const response = await runLoopbrainQuery({
        workspaceId: workspace.id,
        userId: user.id,
        query: question,
        mode: 'org',
        metadata: {},
      });

      console.log('\n📊 Response:');
      console.log(`  Mode: ${response.mode}`);
      console.log(`  Answer length: ${response.answer.length} chars`);
      console.log(`  Answer preview: ${response.answer.substring(0, 200)}...`);
      console.log();
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      console.log();
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
