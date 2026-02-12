#!/usr/bin/env tsx
/**
 * Script to test Loopbrain org questions after sync
 * 
 * Usage: npx tsx scripts/diagnostic/test-loopbrain-org.ts
 */

import { prisma } from '../../src/lib/db';
import { buildOrgQuestionPrompt } from '../../src/lib/loopbrain/orgQuestionPrompt';
import { runOrgQuestionLLM } from '../../src/lib/loopbrain/orgLlmClient';

async function main() {
  console.log('🧪 Testing Loopbrain Org Questions...\n');

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

  // Pull Org-related ContextItems from the context store
  const items = await prisma.contextItem.findMany({
    where: {
      workspaceId,
      type: {
        in: ['department', 'team', 'role', 'person'],
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  console.log(`📋 Found ${items.length} ContextItems`);
  
  if (items.length === 0) {
    console.error('❌ No org ContextItems found! Sync required.');
    console.log('   Run: npx tsx scripts/diagnostic/run-org-sync.ts');
    process.exit(1);
  }

  // Show breakdown by type
  const itemsByType: Record<string, number> = {};
  items.forEach(item => {
    itemsByType[item.type] = (itemsByType[item.type] || 0) + 1;
  });
  console.log('   By type:', itemsByType);

  // Test questions
  const testQuestions = [
    'Who is the CEO?',
    'How many people work here?',
    'What teams do we have?',
    'Who reports to Antoine?',
  ];

  console.log('\n🔍 Testing questions...\n');

  for (const question of testQuestions) {
    console.log(`❓ Question: "${question}"`);
    
    try {
      const prompt = buildOrgQuestionPrompt({
        question,
        workspaceId,
        items,
      });

      // Call LLM for a real answer
      const llmResult = await runOrgQuestionLLM({
        system: prompt.system,
        user: prompt.user,
      });

      const answer = llmResult.answer ?? '';
      console.log(`✅ Answer: ${answer.substring(0, 200)}${answer.length > 200 ? '...' : ''}`);
      console.log(`   Model: ${llmResult.model}, Tokens: ${llmResult.usage?.total_tokens || 'N/A'}\n`);
    } catch (error) {
      console.error(`❌ Failed:`, error instanceof Error ? error.message : error);
      console.log();
    }
  }

  console.log('✅ Test completed!');

  await prisma.$disconnect();
}

main().catch(console.error);
