#!/usr/bin/env tsx
/**
 * Test the orchestrator with mode="dashboard" — simulating the actual UI path
 */

import { runLoopbrainQuery } from '../../src/lib/loopbrain/orchestrator';

async function main() {
  const { prisma } = await import('../../src/lib/db');
  
  const workspace = await prisma.workspace.findFirst();
  const user = await prisma.user.findFirst();

  if (!workspace || !user) {
    console.error('No workspace or user found');
    process.exit(1);
  }

  console.log(`📦 Testing as: ${user.name} (${user.id})`);
  console.log(`📦 Workspace: ${workspace.name} (${workspace.id})\n`);

  const testQuestions = [
    'Who is the CEO?',
    'Are you able to tell me who reports to who and who do we have in the organisation',
  ];

  for (const question of testQuestions) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`❓ Question: "${question}"`);
    console.log(`📨 Mode sent: "dashboard" (simulating UI)`);
    console.log('='.repeat(80));

    try {
      const response = await runLoopbrainQuery({
        workspaceId: workspace.id,
        userId: user.id,
        query: question,
        mode: 'dashboard',  // ← THIS IS WHAT THE UI SENDS
        metadata: {},
      });

      console.log(`\n📊 Response mode: ${response.mode}`);
      console.log(`📊 Answer length: ${response.answer.length} chars`);
      console.log(`📊 Answer preview: ${response.answer.substring(0, 300)}`);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
