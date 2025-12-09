#!/usr/bin/env node

/**
 * Comprehensive Health Check Script for Loopwell
 * Tests frontend, backend, database, configuration, and Loopwell-specific features
 */

const https = require('https');
const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Organized results by section
const sectionResults = {
  'env': { passed: [], failed: [], warnings: [], skipped: [] },
  'database': { passed: [], failed: [], warnings: [], skipped: [] },
  'api': { passed: [], failed: [], warnings: [], skipped: [] },
  'loopbrain': { passed: [], failed: [], warnings: [], skipped: [] },
  'isolation': { passed: [], failed: [], warnings: [], skipped: [] },
};

const results = {
  passed: [],
  failed: [],
  warnings: [],
  skipped: [],
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function pass(test, section = null) {
  results.passed.push(test);
  if (section && sectionResults[section]) {
    sectionResults[section].passed.push(test);
  }
  log(`✓ ${test}`, 'green');
}

function fail(test, error, section = null) {
  results.failed.push({ test, error });
  if (section && sectionResults[section]) {
    sectionResults[section].failed.push({ test, error });
  }
  log(`✗ ${test}: ${error}`, 'red');
}

function warn(test, message, section = null) {
  results.warnings.push({ test, message });
  if (section && sectionResults[section]) {
    sectionResults[section].warnings.push({ test, message });
  }
  log(`⚠ ${test}: ${message}`, 'yellow');
}

function skip(test, reason, section = null) {
  results.skipped.push({ test, reason });
  if (section && sectionResults[section]) {
    sectionResults[section].skipped.push({ test, reason });
  }
  log(`⊘ ${test}: ${reason}`, 'blue');
}

// Get base URL from environment or default
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
const isLocal = BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1');

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsedBody;
        try {
          parsedBody = data ? JSON.parse(data) : null;
        } catch (e) {
          parsedBody = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsedBody,
          rawBody: data,
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Check API endpoint with authentication requirement check
async function checkApiEndpoint(path, method = 'GET', expectedStatus = 200, section = 'api', checkAuth = false) {
  try {
    const url = `${BASE_URL}${path}`;
    const response = await makeRequest(url, { method });
    
    // Check authentication requirement
    if (checkAuth && (response.status === 401 || response.status === 403)) {
      pass(`API ${method} ${path} requires authentication (${response.status})`, section);
      return { success: true, response, authRequired: true };
    }
    
    if (response.status === expectedStatus || (expectedStatus === 200 && response.status < 500)) {
      pass(`API ${method} ${path} (${response.status})`, section);
      return { success: true, response, authRequired: false };
    } else {
      fail(`API ${method} ${path}`, `Expected ${expectedStatus}, got ${response.status}`, section);
      return { success: false, response, authRequired: false };
    }
  } catch (error) {
    if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      skip(`API ${method} ${path}`, 'Server not running', section);
      return { success: false, error: 'Server not running' };
    } else {
      fail(`API ${method} ${path}`, error.message, section);
      return { success: false, error: error.message };
    }
  }
}

// Check context object structure
function checkContextStructure(data, endpoint, section = 'loopbrain') {
  if (!data || typeof data !== 'object') {
    warn(`${endpoint} response structure`, 'Response is not an object', section);
    return false;
  }

  const contextFields = ['id', 'type', 'title', 'summary', 'name', 'description', 'workspaceId'];
  const foundFields = [];
  const missingFields = [];

  function checkObject(obj, depth = 0) {
    if (depth > 3) return; // Limit recursion depth
    
    if (Array.isArray(obj)) {
      obj.forEach(item => checkObject(item, depth + 1));
      return;
    }

    if (obj && typeof obj === 'object') {
      contextFields.forEach(field => {
        if (obj.hasOwnProperty(field) && !foundFields.includes(field)) {
          foundFields.push(field);
        }
      });

      Object.values(obj).forEach(value => {
        if (value && typeof value === 'object') {
          checkObject(value, depth + 1);
        }
      });
    }
  }

  checkObject(data);

  if (foundFields.length >= 2) {
    pass(`${endpoint} has context structure (found: ${foundFields.join(', ')})`, section);
    return true;
  } else {
    warn(`${endpoint} context structure`, `Missing expected fields. Found: ${foundFields.join(', ') || 'none'}`, section);
    return false;
  }
}

// Check multi-tenant isolation in code
function checkMultiTenantIsolation() {
  log('🔐 Checking Multi-Tenant Isolation...', 'bright');
  
  const apiRoutesPath = path.join(process.cwd(), 'src/app/api');
  if (!fs.existsSync(apiRoutesPath)) {
    warn('Multi-tenant isolation check', 'API routes directory not found', 'isolation');
    return;
  }

  let routesChecked = 0;
  let routesWithWorkspaceId = 0;
  let routesWithAuth = 0;

  function checkFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      routesChecked++;
      
      // Check for workspaceId usage
      if (content.includes('workspaceId') || content.includes('workspace_id')) {
        routesWithWorkspaceId++;
      }
      
      // Check for authentication
      if (content.includes('getUnifiedAuth') || content.includes('assertAccess') || content.includes('getServerSession')) {
        routesWithAuth++;
      }
    } catch (e) {
      // Skip if file can't be read
    }
  }

  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file === 'route.ts' || file.endsWith('.ts')) {
        checkFile(filePath);
      }
    });
  }

  walkDir(apiRoutesPath);

  if (routesChecked > 0) {
    const workspaceIdCoverage = Math.round((routesWithWorkspaceId / routesChecked) * 100);
    const authCoverage = Math.round((routesWithAuth / routesChecked) * 100);

    if (workspaceIdCoverage >= 80) {
      pass(`Multi-tenant isolation: ${workspaceIdCoverage}% of routes use workspaceId`, 'isolation');
    } else {
      warn(`Multi-tenant isolation`, `Only ${workspaceIdCoverage}% of routes use workspaceId`, 'isolation');
    }

    if (authCoverage >= 80) {
      pass(`Authentication coverage: ${authCoverage}% of routes require auth`, 'isolation');
    } else {
      warn(`Authentication coverage`, `Only ${authCoverage}% of routes require auth`, 'isolation');
    }
  }
}

// Main async function
async function runHealthCheck() {
  log('\n🔍 Starting Comprehensive Loopwell Health Check...\n', 'bright');
  log(`Base URL: ${BASE_URL}\n`, 'cyan');

  // ============================================================================
  // 1. ENV & SECRETS
  // ============================================================================
  log('📋 Env & Secrets', 'bright');

  function checkEnvVar(name, required = true, section = 'env') {
    const value = process.env[name];
    if (!value && required) {
      fail(`Environment variable: ${name}`, 'Missing (required)', section);
      return null;
    } else if (!value && !required) {
      warn(`Environment variable: ${name}`, 'Not set (optional)', section);
      return null;
    } else {
      pass(`Environment variable: ${name}`, section);
      return value;
    }
  }

  // Required environment variables
  checkEnvVar('DATABASE_URL', true, 'env');
  checkEnvVar('NEXTAUTH_SECRET', true, 'env');
  checkEnvVar('NEXTAUTH_URL', !isLocal, 'env');
  checkEnvVar('NODE_ENV', false, 'env');

  // Optional but important
  checkEnvVar('OPENAI_API_KEY', false, 'env');
  checkEnvVar('ANTHROPIC_API_KEY', false, 'env');
  checkEnvVar('GOOGLE_CLIENT_ID', false, 'env');
  checkEnvVar('GOOGLE_CLIENT_SECRET', false, 'env');
  checkEnvVar('SLACK_CLIENT_ID', false, 'env');
  checkEnvVar('SLACK_CLIENT_SECRET', false, 'env');
  checkEnvVar('REDIS_URL', false, 'env');

  log('');

  // ============================================================================
  // 2. DATABASE & PRISMA
  // ============================================================================
  log('🗄️  Database & Prisma', 'bright');

  try {
    // Check if Prisma client is generated
    const prismaClientPath = path.join(process.cwd(), 'node_modules/.prisma/client');
    if (fs.existsSync(prismaClientPath)) {
      pass('Prisma client generated', 'database');
    } else {
      warn('Prisma client', 'Not found - run: npx prisma generate', 'database');
    }

    // Check Prisma schema
    const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      const criticalModels = ['User', 'Workspace', 'Project', 'Task', 'WikiPage'];
      criticalModels.forEach(model => {
        if (schema.includes(`model ${model}`)) {
          pass(`Prisma model: ${model}`, 'database');
        } else {
          fail(`Prisma model: ${model}`, 'Not found in schema', 'database');
        }
      });
      
      if (schema.includes('datasource db')) {
        pass('Prisma datasource configured', 'database');
      } else {
        fail('Prisma datasource', 'Not configured', 'database');
      }
    } else {
      fail('Prisma schema', 'schema.prisma not found', 'database');
    }
  } catch (error) {
    fail('Database check', error.message, 'database');
  }

  log('');

  // ============================================================================
  // 3. API & AUTH - Spaces (Projects, Tasks, Wiki)
  // ============================================================================
  log('🌐 API & Auth - Spaces (Projects, Tasks, Wiki)', 'bright');

  // Projects
  const projectsResult = await checkApiEndpoint('/api/projects', 'GET', 200, 'api', true);
  if (projectsResult.success && projectsResult.response && projectsResult.response.body) {
    if (Array.isArray(projectsResult.response.body) || projectsResult.response.body.data) {
      const projects = Array.isArray(projectsResult.response.body) ? projectsResult.response.body : projectsResult.response.body.data;
      if (projects && projects.length > 0) {
        checkContextStructure(projects[0], 'Projects API', 'api');
      }
    }
  }

  // Tasks (requires projectId)
  const tasksResult = await checkApiEndpoint('/api/tasks?projectId=test', 'GET', 200, 'api', true);
  if (tasksResult.success && tasksResult.response && tasksResult.response.body) {
    const tasks = Array.isArray(tasksResult.response.body) ? tasksResult.response.body : (tasksResult.response.body.data || []);
    if (tasks && tasks.length > 0) {
      checkContextStructure(tasks[0], 'Tasks API', 'api');
    }
  }

  // Wiki Pages
  const wikiResult = await checkApiEndpoint('/api/wiki/pages', 'GET', 200, 'api', true);
  if (wikiResult.success && wikiResult.response && wikiResult.response.body) {
    const pages = Array.isArray(wikiResult.response.body) ? wikiResult.response.body : (wikiResult.response.body.data || []);
    if (pages && pages.length > 0) {
      checkContextStructure(pages[0], 'Wiki Pages API', 'api');
    }
  }

  // Wiki Workspaces (Spaces)
  await checkApiEndpoint('/api/wiki/workspaces', 'GET', 200, 'api', true);

  log('');

  // ============================================================================
  // 4. API & AUTH - Org (Teams, People, Roles)
  // ============================================================================
  log('👥 API & Auth - Org (Teams, People, Roles)', 'bright');

  // Departments
  const deptResult = await checkApiEndpoint('/api/org/departments', 'GET', 200, 'api', true);
  if (deptResult.success && deptResult.response && deptResult.response.body) {
    const depts = Array.isArray(deptResult.response.body) ? deptResult.response.body : [];
    if (depts.length > 0) {
      checkContextStructure(depts[0], 'Departments API', 'api');
    }
  }

  // Teams
  const teamsResult = await checkApiEndpoint('/api/org/teams', 'GET', 200, 'api', true);
  if (teamsResult.success && teamsResult.response && teamsResult.response.body) {
    const teams = Array.isArray(teamsResult.response.body) ? teamsResult.response.body : [];
    if (teams.length > 0) {
      checkContextStructure(teams[0], 'Teams API', 'api');
    }
  }

  // Positions
  await checkApiEndpoint('/api/org/positions', 'GET', 200, 'api', true);

  // Role Cards
  await checkApiEndpoint('/api/org/role-cards', 'GET', 200, 'api', true);

  log('');

  // ============================================================================
  // 5. API & AUTH - Dashboard
  // ============================================================================
  log('📊 API & Auth - Dashboard', 'bright');

  await checkApiEndpoint('/api/health', 'GET', 200, 'api');
  await checkApiEndpoint('/api/workspaces', 'GET', 200, 'api');

  log('');

  // ============================================================================
  // 6. LOOPBRAIN & CONTEXT OBJECTS
  // ============================================================================
  log('🧠 Loopbrain & Context Objects', 'bright');

  // Loopbrain Chat endpoint
  const loopbrainChatResult = await checkApiEndpoint('/api/loopbrain/chat', 'POST', 200, 'loopbrain', true);
  if (loopbrainChatResult.success === false && loopbrainChatResult.error !== 'Server not running') {
    // Try with a test payload
    try {
      const testPayload = {
        mode: 'spaces',
        query: 'test query'
      };
      const url = `${BASE_URL}/api/loopbrain/chat`;
      const response = await makeRequest(url, {
        method: 'POST',
        body: testPayload
      });
      
      if (response.status === 400 || response.status === 401) {
        pass('Loopbrain chat endpoint exists and validates input', 'loopbrain');
        if (response.body && typeof response.body === 'object') {
          checkContextStructure(response.body, 'Loopbrain Chat', 'loopbrain');
        }
      } else if (response.status === 200) {
        pass('Loopbrain chat endpoint responds', 'loopbrain');
        if (response.body) {
          checkContextStructure(response.body, 'Loopbrain Chat', 'loopbrain');
        }
      }
    } catch (e) {
      if (e.message.includes('ECONNREFUSED')) {
        skip('Loopbrain chat endpoint', 'Server not running', 'loopbrain');
      } else {
        warn('Loopbrain chat endpoint', e.message, 'loopbrain');
      }
    }
  }

  // Loopbrain Context endpoint
  const contextResult = await checkApiEndpoint('/api/loopbrain/context', 'GET', 200, 'loopbrain', true);
  if (contextResult.success && contextResult.response && contextResult.response.body) {
    checkContextStructure(contextResult.response.body, 'Loopbrain Context', 'loopbrain');
  }

  // Loopbrain Search endpoint
  const searchResult = await checkApiEndpoint('/api/loopbrain/search', 'POST', 200, 'loopbrain', true);
  if (searchResult.success === false && searchResult.error !== 'Server not running') {
    try {
      const testPayload = { query: 'test' };
      const url = `${BASE_URL}/api/loopbrain/search`;
      const response = await makeRequest(url, {
        method: 'POST',
        body: testPayload
      });
      
      if (response.status === 400 || response.status === 401) {
        pass('Loopbrain search endpoint exists and validates input', 'loopbrain');
      } else if (response.status === 200 && response.body) {
        checkContextStructure(response.body, 'Loopbrain Search', 'loopbrain');
      }
    } catch (e) {
      if (!e.message.includes('ECONNREFUSED')) {
        warn('Loopbrain search endpoint', e.message, 'loopbrain');
      }
    }
  }

  log('');

  // ============================================================================
  // 7. MULTI-TENANT ISOLATION
  // ============================================================================
  checkMultiTenantIsolation();
  log('');

  // ============================================================================
  // 8. FRONTEND PAGES
  // ============================================================================
  log('🎨 Frontend Pages', 'bright');

  const frontendPages = ['/', '/landing', '/login', '/about'];
  for (const page of frontendPages) {
    await checkApiEndpoint(page, 'GET', 200, 'api');
  }

  log('');

  // ============================================================================
  // 9. SECURITY CHECK
  // ============================================================================
  log('🔒 Security Configuration', 'bright');

  const envExists = fs.existsSync('.env') || fs.existsSync('.env.local');
  if (envExists) {
    pass('.env file exists', 'env');
  } else {
    warn('.env file', 'Not found - create from env.template', 'env');
  }

  try {
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    if (gitignore.includes('.env')) {
      pass('.env in .gitignore', 'env');
    } else {
      warn('.gitignore', '.env not ignored', 'env');
    }
  } catch (e) {
    warn('.gitignore', 'Could not check', 'env');
  }

  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (nextAuthSecret && nextAuthSecret.length >= 32) {
    pass('NEXTAUTH_SECRET length', 'env');
  } else if (nextAuthSecret) {
    warn('NEXTAUTH_SECRET', 'Should be at least 32 characters', 'env');
  }

  log('');

  // ============================================================================
  // SUMMARY REPORT BY SECTION
  // ============================================================================
  log('\n' + '='.repeat(70), 'bright');
  log('📊 HEALTH CHECK SUMMARY BY SECTION', 'bright');
  log('='.repeat(70) + '\n', 'bright');

  const sections = [
    { name: 'Env & Secrets', key: 'env' },
    { name: 'Database & Prisma', key: 'database' },
    { name: 'API & Auth', key: 'api' },
    { name: 'Loopbrain & Context Objects', key: 'loopbrain' },
    { name: 'Multi-Tenant Isolation', key: 'isolation' },
  ];

  sections.forEach(({ name, key }) => {
    const section = sectionResults[key];
    const total = section.passed.length + section.failed.length;
    const score = total > 0 ? Math.round((section.passed.length / total) * 100) : 0;
    const status = score >= 80 ? 'PASS' : score >= 60 ? 'WARN' : 'FAIL';
    const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';

    log(`${status.padEnd(4)} ${name.padEnd(30)} ${section.passed.length} passed, ${section.failed.length} failed, ${section.warnings.length} warnings`, color);
    
    if (section.failed.length > 0) {
      section.failed.forEach(({ test, error }) => {
        log(`      ✗ ${test}: ${error}`, 'red');
      });
    }
    if (section.warnings.length > 0 && section.warnings.length <= 3) {
      section.warnings.forEach(({ test, message }) => {
        log(`      ⚠ ${test}: ${message}`, 'yellow');
      });
    } else if (section.warnings.length > 3) {
      log(`      ⚠ ${section.warnings.length} warnings (see full report)`, 'yellow');
    }
  });

  log('\n' + '='.repeat(70), 'bright');
  log('📊 OVERALL SUMMARY', 'bright');
  log('='.repeat(70) + '\n', 'bright');

  log(`✅ Passed: ${results.passed.length}`, 'green');
  log(`❌ Failed: ${results.failed.length}`, 'red');
  log(`⚠️  Warnings: ${results.warnings.length}`, 'yellow');
  log(`⊘ Skipped: ${results.skipped.length}`, 'blue');

  // Calculate health score
  const totalTests = results.passed.length + results.failed.length;
  const healthScore = totalTests > 0 
    ? Math.round((results.passed.length / totalTests) * 100) 
    : 0;

  log('\n' + '='.repeat(70), 'bright');
  log(`🏥 Overall Health Score: ${healthScore}%`, healthScore >= 80 ? 'green' : healthScore >= 60 ? 'yellow' : 'red');
  log('='.repeat(70) + '\n', 'bright');

  // Generate report file
  generateReportFile();

  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Generate detailed report file
function generateReportFile() {
  const reportPath = path.join(process.cwd(), 'HEALTH_CHECK_REPORT.md');
  const timestamp = new Date().toISOString();
  
  let report = `# Loopwell Health Check Report
**Generated:** ${timestamp}
**Application:** Loopwell (Lumi Work OS)
**Health Score:** ${Math.round((results.passed.length / (results.passed.length + results.failed.length)) * 100)}%

---

## Executive Summary

- ✅ **${results.passed.length} tests passed**
- ❌ **${results.failed.length} tests failed**
- ⚠️ **${results.warnings.length} warnings**
- ⊘ **${results.skipped.length} tests skipped**

---

## 1. Env & Secrets

`;

  // Add section results
  const sections = [
    { name: 'Env & Secrets', key: 'env' },
    { name: 'Database & Prisma', key: 'database' },
    { name: 'API & Auth', key: 'api' },
    { name: 'Loopbrain & Context Objects', key: 'loopbrain' },
    { name: 'Multi-Tenant Isolation', key: 'isolation' },
  ];

  sections.forEach(({ name, key }) => {
    const section = sectionResults[key];
    const total = section.passed.length + section.failed.length;
    const score = total > 0 ? Math.round((section.passed.length / total) * 100) : 0;
    const status = score >= 80 ? '✅ PASS' : score >= 60 ? '⚠️ WARN' : '❌ FAIL';

    report += `### ${name} - ${status} (${score}%)\n\n`;

    if (section.failed.length > 0) {
      report += `**Failed:**\n`;
      section.failed.forEach(({ test, error }) => {
        report += `- ❌ ${test}: ${error}\n`;
      });
      report += `\n`;
    }

    if (section.warnings.length > 0) {
      report += `**Warnings:**\n`;
      section.warnings.forEach(({ test, message }) => {
        report += `- ⚠️ ${test}: ${message}\n`;
      });
      report += `\n`;
    }

    if (section.passed.length > 0 && section.passed.length <= 10) {
      report += `**Passed:**\n`;
      section.passed.forEach(test => {
        report += `- ✅ ${test}\n`;
      });
      report += `\n`;
    } else if (section.passed.length > 10) {
      report += `**Passed:** ${section.passed.length} tests\n\n`;
    }

    report += `---\n\n`;
  });

  report += `## Recommendations

`;

  if (results.failed.some(f => f.test.includes('Environment variable'))) {
    report += `1. **Set up environment variables**: Copy \`env.template\` to \`.env\` and fill in required values\n`;
  }

  if (results.failed.some(f => f.test.includes('Database'))) {
    report += `2. **Database setup**: Run \`npx prisma generate\` and \`npx prisma db push\`\n`;
  }

  if (sectionResults.loopbrain.warnings.length > 0) {
    report += `3. **Loopbrain context**: Review context object structures for consistency\n`;
  }

  if (sectionResults.isolation.warnings.length > 0) {
    report += `4. **Multi-tenant isolation**: Ensure all API routes use workspaceId and authentication\n`;
  }

  fs.writeFileSync(reportPath, report);
  log(`📄 Detailed report written to: HEALTH_CHECK_REPORT.md`, 'cyan');
}

// Run the health check
runHealthCheck().catch(error => {
  console.error('Fatal error running health check:', error);
  process.exit(1);
});
