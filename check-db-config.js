#!/usr/bin/env node

/**
 * Database Configuration Checker
 * 
 * Checks:
 * 1. What DATABASE_URL is configured (from .env files)
 * 2. Which .env files Next/Prisma could be using
 * 3. Whether the database is local or remote
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function colorize(text, color) {
  return `${color}${text}${colors.reset}`;
}

function parseDatabaseUrl(url) {
  try {
    const urlObj = new URL(url);
    return {
      protocol: urlObj.protocol.replace(':', ''),
      hostname: urlObj.hostname,
      port: urlObj.port || '5432',
      database: urlObj.pathname.slice(1).split('?')[0],
      username: urlObj.username || '(not set)',
      searchParams: Object.fromEntries(urlObj.searchParams),
    };
  } catch (e) {
    return null;
  }
}

function isLocalDatabase(hostname) {
  const localHosts = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'postgres',
    'lumi-postgres',
    'db',
    'database',
  ];
  
  // Check if it's a local IP (private network ranges)
  const isPrivateIP = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);
  
  return localHosts.includes(hostname.toLowerCase()) || isPrivateIP;
}

function isDockerHost(hostname) {
  return ['postgres', 'lumi-postgres', 'db', 'database'].includes(hostname.toLowerCase());
}

function readEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const envVars = {};
    
    for (const line of lines) {
      // Skip comments and empty lines
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      // Match KEY=VALUE or KEY="VALUE" or KEY='VALUE'
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        envVars[key] = value;
      }
    }
    
    return envVars;
  } catch (e) {
    return null;
  }
}

function getEnvFileInfo(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const stats = fs.statSync(filePath);
    return {
      exists: true,
      path: filePath,
      size: stats.size,
      modified: stats.mtime,
      readable: true,
    };
  } catch (e) {
    return {
      exists: true,
      path: filePath,
      readable: false,
      error: e.message,
    };
  }
}

// Main execution
console.log(colorize('\n=== Database Configuration Checker ===\n', colors.bright));

// 1. Check environment variable
console.log(colorize('1) Environment Variable (DATABASE_URL)', colors.cyan));
const envDbUrl = process.env.DATABASE_URL;
if (envDbUrl) {
  console.log(`   ${colorize('✓', colors.green)} DATABASE_URL is set in environment`);
  console.log(`   Value: ${envDbUrl.substring(0, 50)}${envDbUrl.length > 50 ? '...' : ''}`);
} else {
  console.log(`   ${colorize('✗', colors.yellow)} DATABASE_URL not set in environment`);
}
console.log();

// 2. Check .env files
console.log(colorize('2) .env Files (Next.js/Prisma Priority Order)', colors.cyan));

const envFiles = [
  { path: '.env.local', priority: 1, description: 'Highest priority (local overrides)' },
  { path: '.env', priority: 2, description: 'Default environment file' },
  { path: '.env.production', priority: 3, description: 'Production overrides (if NODE_ENV=production)' },
  { path: '.env.development', priority: 4, description: 'Development overrides (if NODE_ENV=development)' },
];

let foundDbUrl = null;
let foundInFile = null;

for (const envFile of envFiles) {
  const info = getEnvFileInfo(envFile.path);
  if (info && info.exists) {
    const envVars = readEnvFile(envFile.path);
    const hasDbUrl = envVars && envVars.DATABASE_URL;
    
    console.log(`   ${colorize(`[${envFile.priority}]`, colors.blue)} ${envFile.path}`);
    console.log(`      ${info.readable ? colorize('✓', colors.green) : colorize('✗', colors.red)} Readable: ${info.readable ? 'Yes' : `No (${info.error})`}`);
    console.log(`      Modified: ${info.modified.toLocaleString()}`);
    console.log(`      Size: ${info.size} bytes`);
    
    if (hasDbUrl) {
      console.log(`      ${colorize('✓ DATABASE_URL found', colors.green)}`);
      if (!foundDbUrl) {
        foundDbUrl = envVars.DATABASE_URL;
        foundInFile = envFile.path;
      }
    } else {
      console.log(`      ${colorize('✗ No DATABASE_URL', colors.yellow)}`);
    }
    console.log(`      ${colorize('Note:', colors.yellow)} ${envFile.description}`);
  } else {
    console.log(`   ${colorize(`[${envFile.priority}]`, colors.blue)} ${envFile.path} ${colorize('(not found)', colors.yellow)}`);
  }
  console.log();
}

// 3. Determine which DATABASE_URL will be used
console.log(colorize('3) Active DATABASE_URL (Priority Order)', colors.cyan));
let activeDbUrl = null;
let activeSource = null;

if (envDbUrl) {
  activeDbUrl = envDbUrl;
  activeSource = 'Environment variable';
  console.log(`   ${colorize('Source:', colors.bright)} Environment variable (highest priority)`);
} else if (foundDbUrl) {
  activeDbUrl = foundDbUrl;
  activeSource = foundInFile;
  console.log(`   ${colorize('Source:', colors.bright)} ${foundInFile}`);
} else {
  console.log(`   ${colorize('✗', colors.red)} No DATABASE_URL found in environment or .env files!`);
  console.log(`   ${colorize('⚠', colors.yellow)} Prisma/Next.js will fail to connect without DATABASE_URL`);
  console.log();
  process.exit(1);
}

console.log();

// 4. Parse and display database information
if (activeDbUrl) {
  console.log(colorize('4) Database Connection Details', colors.cyan));
  const parsed = parseDatabaseUrl(activeDbUrl);
  
  if (!parsed) {
    console.log(`   ${colorize('✗', colors.red)} Invalid DATABASE_URL format`);
    console.log(`   URL: ${activeDbUrl}`);
  } else {
    const isLocal = isLocalDatabase(parsed.hostname);
    const isDocker = isDockerHost(parsed.hostname);
    
    console.log(`   ${colorize('Host:', colors.bright)} ${parsed.hostname}`);
    console.log(`   ${colorize('Port:', colors.bright)} ${parsed.port}`);
    console.log(`   ${colorize('Database:', colors.bright)} ${parsed.database || '(not specified)'}`);
    console.log(`   ${colorize('Username:', colors.bright)} ${parsed.username}`);
    console.log(`   ${colorize('Protocol:', colors.bright)} ${parsed.protocol}`);
    
    if (Object.keys(parsed.searchParams).length > 0) {
      console.log(`   ${colorize('Parameters:', colors.bright)}`);
      for (const [key, value] of Object.entries(parsed.searchParams)) {
        console.log(`      - ${key}: ${value}`);
      }
    }
    
    console.log();
    console.log(colorize('5) Database Location Analysis', colors.cyan));
    
    if (isLocal) {
      console.log(`   ${colorize('✓', colors.green)} ${colorize('LOCAL DATABASE', colors.bright + colors.green)}`);
      if (isDocker) {
        console.log(`   ${colorize('→', colors.cyan)} Likely Docker container (hostname: ${parsed.hostname})`);
        console.log(`   ${colorize('→', colors.cyan)} Connect from host using: localhost:${parsed.port}`);
      } else {
        console.log(`   ${colorize('→', colors.cyan)} Running on local machine`);
      }
    } else {
      console.log(`   ${colorize('✓', colors.yellow)} ${colorize('REMOTE DATABASE', colors.bright + colors.yellow)}`);
      if (parsed.hostname.includes('supabase.com')) {
        console.log(`   ${colorize('→', colors.cyan)} Supabase hosted database`);
        if (parsed.hostname.includes('pooler')) {
          console.log(`   ${colorize('→', colors.cyan)} Using connection pooler (PgBouncer)`);
        }
      } else if (parsed.hostname.includes('aws') || parsed.hostname.includes('amazonaws.com')) {
        console.log(`   ${colorize('→', colors.cyan)} AWS RDS or similar`);
      } else {
        console.log(`   ${colorize('→', colors.cyan)} Remote database server`);
      }
    }
  }
}

console.log();
console.log(colorize('=== Summary ===', colors.bright));
console.log(`Active DATABASE_URL source: ${activeSource || 'None'}`);
if (activeDbUrl && parsed) {
  console.log(`Database: ${parsed.database || '(not specified)'} @ ${parsed.hostname}:${parsed.port}`);
  console.log(`Location: ${isLocal ? 'LOCAL' : 'REMOTE'}`);
} else {
  console.log(colorize('⚠ No valid DATABASE_URL found!', colors.red));
}
console.log();

