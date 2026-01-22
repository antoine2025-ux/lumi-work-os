#!/usr/bin/env tsx
/**
 * Audit script to find Prisma queries that may be missing workspaceId filters
 * 
 * This script searches for common Prisma query patterns and checks if they
 * include workspaceId in their where clauses.
 * 
 * Usage: npx tsx scripts/audit-workspace-scoping.ts
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const WORKSPACE_SCOPED_MODELS = [
  'Project',
  'Task',
  'Epic',
  'Milestone',
  'WikiPage',
  'WikiChunk',
  'WikiEmbed',
  'WikiAttachment',
  'WikiComment',
  'WikiVersion',
  'WikiPagePermission',
  'ChatSession',
  'ChatMessage',
  'FeatureFlag',
  'Integration',
  'Migration',
  'Workflow',
  'WorkflowInstance',
  'OnboardingTemplate',
  'OnboardingPlan',
  'OrgPosition',
  'ProjectTemplate',
  'TaskTemplate',
  'Activity',
  'CustomFieldDef',
  'CustomFieldVal',
  'TaskHistory',
  'ProjectDailySummary',
  'ProjectMember',
  'ProjectWatcher',
  'ProjectAssignee',
  'Subtask',
  'TaskComment',
  'ContextItem',
  'ContextEmbedding',
  'ContextSummary'
];

interface QueryFinding {
  file: string;
  line: number;
  model: string;
  operation: string;
  hasWorkspaceId: boolean;
  code: string;
}

function findPrismaQueries(content: string, filePath: string): QueryFinding[] {
  const findings: QueryFinding[] = [];
  const lines = content.split('\n');

  // Pattern to match: prisma.modelName.operation
  const queryPattern = /prisma\.(\w+)\.(findMany|findFirst|findUnique|create|update|updateMany|delete|deleteMany|count)/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;

    while ((match = queryPattern.exec(line)) !== null) {
      const modelName = match[1];
      const operation = match[2];

      // Check if this is a workspace-scoped model
      if (WORKSPACE_SCOPED_MODELS.includes(modelName)) {
        // Check if workspaceId appears in the where clause
        // Look ahead a few lines for the where clause
        let hasWorkspaceId = false;
        let codeSnippet = line;

        // Check current line and next 10 lines for workspaceId
        for (let j = i; j < Math.min(i + 10, lines.length); j++) {
          const checkLine = lines[j];
          codeSnippet += '\n' + checkLine;
          
          // Check for workspaceId in where clause
          if (checkLine.includes('workspaceId') && 
              (checkLine.includes('where:') || checkLine.includes('workspaceId:'))) {
            hasWorkspaceId = true;
            break;
          }

          // Stop if we hit the closing brace or next statement
          if (checkLine.trim().endsWith(')') && j > i + 2) {
            break;
          }
        }

        findings.push({
          file: filePath,
          line: i + 1,
          model: modelName,
          operation,
          hasWorkspaceId,
          code: codeSnippet.substring(0, 200), // First 200 chars
        });
      }
    }
  }

  return findings;
}

function scanDirectory(dir: string, extensions: string[] = ['.ts', '.tsx']): QueryFinding[] {
  const findings: QueryFinding[] = [];

  function scan(path: string) {
    const entries = readdirSync(path);

    for (const entry of entries) {
      // Skip node_modules, .next, etc.
      if (entry.startsWith('.') || entry === 'node_modules' || entry === '.next') {
        continue;
      }

      const fullPath = join(path, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (stat.isFile()) {
        const ext = entry.substring(entry.lastIndexOf('.'));
        if (extensions.includes(ext)) {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const fileFindings = findPrismaQueries(content, fullPath);
            findings.push(...fileFindings);
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    }
  }

  scan(dir);
  return findings;
}

// Main execution
console.log('🔍 Auditing Prisma queries for workspace scoping...\n');

const findings = scanDirectory(join(process.cwd(), 'src'));

// Group findings by model
const byModel = new Map<string, QueryFinding[]>();
const missingWorkspaceId: QueryFinding[] = [];

for (const finding of findings) {
  if (!byModel.has(finding.model)) {
    byModel.set(finding.model, []);
  }
  byModel.get(finding.model)!.push(finding);

  if (!finding.hasWorkspaceId) {
    missingWorkspaceId.push(finding);
  }
}

// Report
console.log(`📊 Found ${findings.length} Prisma queries on workspace-scoped models\n`);

if (missingWorkspaceId.length > 0) {
  console.log(`⚠️  ${missingWorkspaceId.length} queries may be missing workspaceId filters:\n`);
  
  // Group by file
  const byFile = new Map<string, QueryFinding[]>();
  for (const finding of missingWorkspaceId) {
    if (!byFile.has(finding.file)) {
      byFile.set(finding.file, []);
    }
    byFile.get(finding.file)!.push(finding);
  }

  for (const [file, fileFindings] of byFile.entries()) {
    console.log(`  ${file}:`);
    for (const finding of fileFindings) {
      console.log(`    Line ${finding.line}: ${finding.model}.${finding.operation}`);
      console.log(`    Code: ${finding.code.substring(0, 100)}...`);
    }
    console.log('');
  }
} else {
  console.log('✅ All queries appear to have workspaceId filters!\n');
}

// Summary by model
console.log('\n📈 Summary by model:');
for (const [model, modelFindings] of Array.from(byModel.entries()).sort()) {
  const missing = modelFindings.filter(f => !f.hasWorkspaceId).length;
  const total = modelFindings.length;
  const status = missing > 0 ? '⚠️' : '✅';
  console.log(`  ${status} ${model}: ${total} queries, ${missing} may be missing workspaceId`);
}

console.log('\n💡 Note: This is a static analysis. Some queries may derive workspaceId from relations.');
console.log('💡 Review each finding manually to confirm if workspaceId filter is needed.\n');
