#!/usr/bin/env tsx
import { runLoopbrainQuery } from '../../src/lib/loopbrain/orchestrator';

async function main() {
  const { prisma } = await import('../../src/lib/db');
  
  const workspace = await prisma.workspace.findFirst();
  const user = await prisma.user.findFirst();

  if (!workspace || !user) {
    console.error('No workspace or user found');
    process.exit(1);
  }

  const question = 'Are you able to tell me who reports to who and who do we have in the organisation';
  
  console.log(`Question: "${question}"\n`);

  const response = await runLoopbrainQuery({
    workspaceId: workspace.id,
    userId: user.id,
    query: question,
    mode: 'org',
    metadata: {},
  });

  console.log('Full Answer:');
  console.log('='.repeat(80));
  console.log(response.answer);
  console.log('='.repeat(80));

  await prisma.$disconnect();
}

main().catch(console.error);
