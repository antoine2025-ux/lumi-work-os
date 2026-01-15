#!/usr/bin/env node
/**
 * Org MVP End-to-End Pressure Test
 * 
 * Tests the complete onboarding flow: People → Structure → Ownership → Setup
 * Uses HTTP requests only (no direct Prisma access) and respects workspaceId-only auth.
 * 
 * Usage:
 *   export ORG_TEST_COOKIE="name=value; name2=value2"
 *   # OR
 *   export ORG_TEST_COOKIE_FILE="./tmp/org-cookie.txt"
 *   npm run org:mvp:pressure-test
 *   npm run org:mvp:smoke  # Non-destructive GET-only mode
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Parse command line arguments
const args = process.argv.slice(2);
const modeArg = args.find(arg => arg.startsWith('--mode='));
const MODE = modeArg ? modeArg.split('=')[1] : 'full';
const isSmokeMode = MODE === 'smoke';

// Load cookie from env var or file
async function loadCookie(): Promise<string | null> {
  // Try cookie file first
  const cookieFile = process.env.ORG_TEST_COOKIE_FILE;
  if (cookieFile) {
    try {
      if (!existsSync(cookieFile)) {
        console.error(`❌ Cookie file not found: ${cookieFile}`);
        return null;
      }
      const content = await readFile(cookieFile, 'utf-8');
      return content.trim();
    } catch (error: any) {
      console.error(`❌ Failed to read cookie file: ${error.message}`);
      return null;
    }
  }

  // Fall back to env var
  return process.env.ORG_TEST_COOKIE || null;
}

// Validate cookie format
function validateCookie(cookie: string): { valid: boolean; error?: string } {
  if (!cookie || cookie.trim().length === 0) {
    return { valid: false, error: 'Cookie is empty' };
  }

  if (cookie.length < 20) {
    return { valid: false, error: 'Cookie seems too short (likely incorrect)' };
  }

  if (!cookie.includes('=')) {
    return { valid: false, error: 'Cookie must contain "=" (format: "name=value; name2=value2")' };
  }

  return { valid: true };
}

interface TestStep {
  name: string;
  method: 'GET' | 'POST';
  url: string;
  body?: any;
  expectedStatus: number;
  extractId?: (response: any) => string | null;
  smokeOnly?: boolean; // Only run in smoke mode
  skipInSmoke?: boolean; // Skip in smoke mode
}

interface TestResult {
  step: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  statusCode?: number;
  duration: number;
  error?: string;
  responseBody?: string;
  hint?: string;
  extractedId?: string;
  response?: any;
}

const results: TestResult[] = [];
let personId: string | null = null;
let departmentId: string | null = null;
let teamId: string | null = null;
let ownershipId: string | null = null;
let cookie: string | null = null;

// Verify endpoint files exist
function verifyEndpoints(): { valid: boolean; missing: string[] } {
  const endpoints = [
    'src/app/api/org/people/create/route.ts',
    'src/app/api/org/structure/departments/create/route.ts',
    'src/app/api/org/structure/teams/create/route.ts',
    'src/app/api/org/ownership/assign/route.ts',
  ];

  const missing: string[] = [];
  for (const endpoint of endpoints) {
    if (!existsSync(join(process.cwd(), endpoint))) {
      missing.push(endpoint);
    }
  }

  return { valid: missing.length === 0, missing };
}

// Get diagnostic hint from error
function getDiagnosticHint(statusCode: number, responseBody: string): string {
  if (statusCode === 401 || statusCode === 403) {
    return 'Auth cookie missing/expired or not workspace-authorized';
  }
  if (statusCode === 404) {
    return 'Route not found - check if endpoint file exists';
  }
  if (statusCode === 500) {
    if (responseBody.includes('Prisma') || responseBody.includes('database')) {
      return 'Database connection issue - check DATABASE_URL and server logs';
    }
    return 'Server error - check server logs for details';
  }
  if (statusCode === 400) {
    if (responseBody.includes('Invalid') || responseBody.includes('required')) {
      return 'Request validation failed - check request body format';
    }
  }
  if (responseBody.includes('feature flag') || responseBody.includes('disabled')) {
    return 'Feature flag write disabled or not enabled';
  }
  return 'Check server logs and response body for details';
}

async function fetchWithTiming(step: TestStep): Promise<TestResult> {
  const startTime = Date.now();
  const url = `${BASE_URL}${step.url}`;
  
  try {
    const options: RequestInit = {
      method: step.method,
      headers: {
        'Cookie': cookie!,
        'Content-Type': 'application/json',
      },
    };

    if (step.body) {
      options.body = JSON.stringify(step.body);
    }

    const response = await fetch(url, options);
    const duration = Date.now() - startTime;
    const contentType = response.headers.get('content-type');
    
    // Capture response body for diagnostics
    let responseData: any = null;
    let responseBodyText = '';
    
    try {
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
        responseBodyText = JSON.stringify(responseData, null, 2);
      } else {
        // For HTML pages, read as text but limit size
        const text = await response.text();
        responseBodyText = text.substring(0, 500); // Limit to 500 chars for HTML
        responseData = { html: true, status: response.status, preview: text.substring(0, 100) };
      }
    } catch (parseError) {
      responseBodyText = `[Failed to parse response: ${parseError}]`;
    }

    const status = response.status === step.expectedStatus ? 'PASS' : 'FAIL';
    const extractedId = step.extractId ? step.extractId(responseData) : null;

    // Extract first 300 chars of response body for diagnostics
    const bodySnippet = responseBodyText.substring(0, 300);
    const hint = status === 'FAIL' ? getDiagnosticHint(response.status, responseBodyText) : undefined;

    return {
      step: step.name,
      status,
      statusCode: response.status,
      duration,
      extractedId,
      response: responseData,
      responseBody: bodySnippet,
      hint,
      error: status === 'FAIL' ? `Expected ${step.expectedStatus}, got ${response.status}` : undefined,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const hint = error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')
      ? 'Server not running - start with: npm run dev'
      : undefined;
    
    return {
      step: step.name,
      status: 'FAIL',
      duration,
      error: error.message || String(error),
      hint,
    };
  }
}

// Define test steps
const fullSteps: TestStep[] = [
  {
    name: '0. Auth check (GET /api/org/overview)',
    method: 'GET',
    url: '/api/org/overview',
    expectedStatus: 200,
    smokeOnly: false,
  },
  {
    name: '1. Load /org page',
    method: 'GET',
    url: '/org',
    expectedStatus: 200,
  },
  {
    name: '2. Load /org/people page',
    method: 'GET',
    url: '/org/people',
    expectedStatus: 200,
  },
  {
    name: '3. Create person',
    method: 'POST',
    url: '/api/org/people/create',
    body: {
      fullName: 'Test Person ' + Date.now(),
      email: `test-${Date.now()}@example.com`,
      title: 'Test Engineer',
    },
    expectedStatus: 201,
    extractId: (res) => res.id || null,
    skipInSmoke: true,
  },
  {
    name: '4. Load /org/structure page',
    method: 'GET',
    url: '/org/structure',
    expectedStatus: 200,
  },
  {
    name: '5. Create department',
    method: 'POST',
    url: '/api/org/structure/departments/create',
    body: {
      name: 'Test Department ' + Date.now(),
    },
    expectedStatus: 201,
    extractId: (res) => res.id || null,
    skipInSmoke: true,
  },
  {
    name: '6. Create team',
    method: 'POST',
    url: '/api/org/structure/teams/create',
    body: {
      name: 'Test Team ' + Date.now(),
      departmentId: '', // Will be set after department is created
    },
    expectedStatus: 201,
    extractId: (res) => res.id || null,
    skipInSmoke: true,
  },
  {
    name: '7. Assign ownership',
    method: 'POST',
    url: '/api/org/ownership/assign',
    body: {
      entityType: 'TEAM',
      entityId: null, // Will be set after team is created
      ownerPersonId: null, // Will be set after person is created
    },
    expectedStatus: 200,
    extractId: (res) => res.id || null,
    skipInSmoke: true,
  },
  {
    name: '8. Load /org/ownership page',
    method: 'GET',
    url: '/org/ownership',
    expectedStatus: 200,
  },
  {
    name: '9. Load /org/setup page',
    method: 'GET',
    url: '/org/setup',
    expectedStatus: 200,
  },
  {
    name: '10. Check overview counts',
    method: 'GET',
    url: '/api/org/overview',
    expectedStatus: 200,
  },
];

// Smoke mode steps (GET only, non-destructive)
const smokeSteps: TestStep[] = [
  {
    name: '0. Auth check (GET /api/org/overview)',
    method: 'GET',
    url: '/api/org/overview',
    expectedStatus: 200,
    smokeOnly: true,
  },
  {
    name: '1. Load /org page',
    method: 'GET',
    url: '/org',
    expectedStatus: 200,
    smokeOnly: true,
  },
  {
    name: '2. Load /org/people page',
    method: 'GET',
    url: '/org/people',
    expectedStatus: 200,
    smokeOnly: true,
  },
  {
    name: '3. Load /org/structure page',
    method: 'GET',
    url: '/org/structure',
    expectedStatus: 200,
    smokeOnly: true,
  },
  {
    name: '4. Load /org/ownership page',
    method: 'GET',
    url: '/org/ownership',
    expectedStatus: 200,
    smokeOnly: true,
  },
  {
    name: '5. Load /org/setup page',
    method: 'GET',
    url: '/org/setup',
    expectedStatus: 200,
    smokeOnly: true,
  },
  {
    name: '6. Check overview counts',
    method: 'GET',
    url: '/api/org/overview',
    expectedStatus: 200,
    smokeOnly: true,
  },
];

async function runTests() {
  console.log(`🚀 Starting Org MVP Pressure Test (Mode: ${MODE})\n`);
  console.log(`Base URL: ${BASE_URL}`);
  
  // Load and validate cookie
  cookie = await loadCookie();
  if (!cookie) {
    console.error('❌ ERROR: ORG_TEST_COOKIE or ORG_TEST_COOKIE_FILE is required');
    console.error('');
    console.error('Usage options:');
    console.error('  Option 1: export ORG_TEST_COOKIE="name=value; name2=value2"');
    console.error('  Option 2: export ORG_TEST_COOKIE_FILE="./tmp/org-cookie.txt"');
    console.error('');
    console.error('See: scripts/org-cookie-help.md for detailed instructions');
    process.exit(1);
  }

  const validation = validateCookie(cookie);
  if (!validation.valid) {
    console.error(`❌ Cookie validation failed: ${validation.error}`);
    console.error('');
    console.error('Cookie format should be: "name=value; name2=value2"');
    console.error('See: scripts/org-cookie-help.md for help');
    process.exit(1);
  }

  if (cookie.length < 20) {
    console.warn('⚠️  WARNING: Cookie seems too short - likely incorrect');
  }

  console.log(`Cookie: ${cookie.substring(0, 30)}... (${cookie.length} chars)\n`);

  // Verify endpoints exist (only in full mode)
  if (!isSmokeMode) {
    const endpointCheck = verifyEndpoints();
    if (!endpointCheck.valid) {
      console.error('❌ ERROR: Required endpoint files are missing:');
      endpointCheck.missing.forEach(m => console.error(`   - ${m}`));
      console.error('');
      console.error('Cannot proceed with full test. Endpoints must exist in repository.');
      process.exit(1);
    }
  }

  // Select steps based on mode
  const steps = isSmokeMode ? smokeSteps : fullSteps.filter(s => !s.skipInSmoke);

  // Run auth check first
  const authStep = steps[0];
  if (authStep.name.includes('Auth check')) {
    process.stdout.write(`Running: ${authStep.name}... `);
    const authResult = await fetchWithTiming(authStep);
    results.push(authResult);

    if (authResult.status === 'FAIL') {
      console.log(`❌ FAIL (${authResult.duration}ms)`);
      console.error('');
      console.error('🚨 AUTH CHECK FAILED');
      console.error(`   Status: ${authResult.statusCode}`);
      if (authResult.hint) {
        console.error(`   Hint: ${authResult.hint}`);
      }
      if (authResult.responseBody) {
        console.error(`   Response: ${authResult.responseBody.substring(0, 200)}`);
      }
      console.error('');
      console.error('Your cookie is missing, expired, or not workspace-authorized.');
      console.error('Please:');
      console.error('  1. Log in via browser');
      console.error('  2. Get fresh cookie (see scripts/org-cookie-help.md)');
      console.error('  3. Re-run the test');
      
      // Still generate scorecard on failure
      await generateScorecard();
      process.exit(1);
    } else {
      console.log(`✅ PASS (${authResult.duration}ms)`);
    }
  }

  // Run remaining tests
  for (let i = 1; i < steps.length; i++) {
    const step = steps[i];
    
    // Skip POST steps in smoke mode
    if (isSmokeMode && step.method === 'POST') {
      const skipResult: TestResult = {
        step: step.name,
        status: 'SKIP',
        duration: 0,
      };
      results.push(skipResult);
      console.log(`⏭️  SKIP (smoke mode - GET only)`);
      continue;
    }
    
    // Inject IDs from previous steps
    if (step.name === '6. Create team') {
      if (!departmentId) {
        const skipResult: TestResult = {
          step: step.name,
          status: 'FAIL',
          duration: 0,
          error: 'Cannot create team: department was not created in previous step',
        };
        results.push(skipResult);
        console.log(`❌ FAIL (skipped - missing dependency)`);
        continue;
      }
      step.body!.departmentId = departmentId;
    }
    if (step.name === '7. Assign ownership') {
      if (!teamId || !personId) {
        const skipResult: TestResult = {
          step: step.name,
          status: 'FAIL',
          duration: 0,
          error: `Cannot assign ownership: missing dependencies (teamId: ${teamId}, personId: ${personId})`,
        };
        results.push(skipResult);
        console.log(`❌ FAIL (skipped - missing dependency)`);
        continue;
      }
      step.body!.entityId = teamId;
      step.body!.ownerPersonId = personId;
    }

    process.stdout.write(`Running: ${step.name}... `);
    const result = await fetchWithTiming(step);
    results.push(result);

    // Store extracted IDs
    if (result.extractedId) {
      if (step.name === '3. Create person') personId = result.extractedId;
      if (step.name === '5. Create department') departmentId = result.extractedId;
      if (step.name === '6. Create team') teamId = result.extractedId;
      if (step.name === '7. Assign ownership') ownershipId = result.extractedId;
    }

    if (result.status === 'PASS') {
      console.log(`✅ PASS (${result.duration}ms)`);
    } else if (result.status === 'SKIP') {
      console.log(`⏭️  SKIP`);
    } else {
      console.log(`❌ FAIL (${result.duration}ms)`);
      console.log(`   Method: ${step.method} ${step.url}`);
      console.log(`   Status: ${result.statusCode}`);
      if (result.hint) {
        console.log(`   Hint: ${result.hint}`);
      }
      if (result.responseBody) {
        const snippet = result.responseBody.length > 300 
          ? result.responseBody.substring(0, 300) + '...'
          : result.responseBody;
        console.log(`   Response: ${snippet}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  }

  // Always generate scorecard (even on failure)
  await generateScorecard();
}

async function generateScorecard() {
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const skipCount = results.filter(r => r.status === 'SKIP').length;
  const totalDuration = results.filter(r => r.status !== 'SKIP').reduce((sum, r) => sum + r.duration, 0);
  const p0Blockers = results.filter(r => r.status === 'FAIL').map(r => r.step);

  // Generate JSON scorecard
  const jsonScorecard = {
    timestamp: new Date().toISOString(),
    mode: MODE,
    summary: {
      total: results.length,
      passed: passCount,
      failed: failCount,
      skipped: skipCount,
      totalDurationMs: totalDuration,
      averageDurationMs: skipCount < results.length ? Math.round(totalDuration / (results.length - skipCount)) : 0,
    },
    results: results.map(r => ({
      step: r.step,
      status: r.status,
      statusCode: r.statusCode,
      durationMs: r.duration,
      error: r.error,
      hint: r.hint,
      responseBody: r.responseBody,
      extractedId: r.extractedId,
    })),
    p0Blockers: p0Blockers,
    createdEntities: {
      personId,
      departmentId,
      teamId,
      ownershipId,
    },
  };

  // Generate MD scorecard
  const mdScorecard = `# Org MVP Readiness Scorecard

> **Auto-generated** - This file is generated by \`scripts/org-mvp-pressure-test.ts\`
> 
> To regenerate: 
> - Full test: \`npm run org:mvp:pressure-test\`
> - Smoke test: \`npm run org:mvp:smoke\`

## Test Summary

- **Mode:** ${MODE.toUpperCase()}
- **Total Steps:** ${results.length}
- **Passed:** ${passCount} ✅
- **Failed:** ${failCount} ${failCount > 0 ? '❌' : ''}
- **Skipped:** ${skipCount} ${skipCount > 0 ? '⏭️' : ''}
- **Total Duration:** ${totalDuration}ms
- **Average Duration:** ${skipCount < results.length ? Math.round(totalDuration / (results.length - skipCount)) : 0}ms
- **Timestamp:** ${new Date().toISOString()}

## Test Results

${results.map((r, i) => {
  const icon = r.status === 'PASS' ? '✅' : r.status === 'SKIP' ? '⏭️' : '❌';
  const details = r.statusCode ? ` (HTTP ${r.statusCode})` : '';
  const error = r.error ? `\n  - Error: ${r.error}` : '';
  const hint = r.hint ? `\n  - Hint: ${r.hint}` : '';
  const id = r.extractedId ? `\n  - Created ID: ${r.extractedId}` : '';
  const body = r.responseBody && r.status === 'FAIL' ? `\n  - Response: \`\`\`\n${r.responseBody.substring(0, 200)}\n\`\`\`` : '';
  return `${i + 1}. ${icon} **${r.step}** - ${r.duration}ms${details}${error}${hint}${id}${body}`;
}).join('\n\n')}

## Created Entities

${personId ? `- Person ID: \`${personId}\`` : '- Person: Not created'}
${departmentId ? `- Department ID: \`${departmentId}\`` : '- Department: Not created'}
${teamId ? `- Team ID: \`${teamId}\`` : '- Team: Not created'}
${ownershipId ? `- Ownership ID: \`${ownershipId}\`` : '- Ownership: Not assigned'}

## P0 Blockers

${p0Blockers.length > 0 
  ? p0Blockers.map(b => `- ❌ ${b}`).join('\n')
  : '- ✅ None - All tests passed!'}

## Next Steps

${failCount > 0 
  ? `⚠️ **Action Required:** Fix ${failCount} failing test(s) before proceeding to production.`
  : '✅ **Ready:** All tests passed. Org MVP is ready for production deployment.'}

---

*Generated by Org MVP Pressure Test (${MODE} mode) on ${new Date().toLocaleString()}*
`;

  // Write files (always, even on failure)
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const docsDir = path.join(process.cwd(), 'docs', 'org');
  await fs.mkdir(docsDir, { recursive: true });

  const jsonPath = path.join(docsDir, 'MVP_READINESS_SCORECARD.json');
  const mdPath = path.join(docsDir, 'MVP_READINESS_SCORECARD.md');

  try {
    await fs.writeFile(jsonPath, JSON.stringify(jsonScorecard, null, 2));
    await fs.writeFile(mdPath, mdScorecard);
  } catch (writeError: any) {
    console.error(`❌ Failed to write scorecards: ${writeError.message}`);
    // Don't exit - still print summary
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Mode: ${MODE.toUpperCase()}`);
  console.log(`Total: ${results.length} | Passed: ${passCount} ✅ | Failed: ${failCount} ${failCount > 0 ? '❌' : ''} | Skipped: ${skipCount} ${skipCount > 0 ? '⏭️' : ''}`);
  if (skipCount < results.length) {
    console.log(`Total Duration: ${totalDuration}ms | Avg: ${Math.round(totalDuration / (results.length - skipCount))}ms`);
  }
  
  if (p0Blockers.length > 0) {
    console.log('\n🚨 P0 BLOCKERS:');
    p0Blockers.forEach(blocker => console.log(`   - ${blocker}`));
  } else {
    console.log('\n✅ All tests passed! No blockers.');
  }

  console.log('\n📄 Scorecards generated:');
  console.log(`   - ${jsonPath}`);
  console.log(`   - ${mdPath}`);
  console.log('');

  // Exit with appropriate code
  process.exit(failCount > 0 ? 1 : 0);
}

// Run tests
runTests().catch(async (error) => {
  console.error('Fatal error:', error);
  // Still try to generate scorecard on fatal error
  try {
    await generateScorecard();
  } catch {
    // Ignore errors in scorecard generation during fatal error
  }
  process.exit(1);
});
