#!/usr/bin/env node
/**
 * Loopwell SQL Injection Static Analyzer
 * Phase 1, Task 4: Raw SQL Call Site Analyzer
 * Detects SQL injection vulnerabilities in the codebase.
 */

const fs = require('fs').promises
const path = require('path')

const SRC_DIR = path.join(__dirname, '../../src')
const PATTERNS = ['$queryRawUnsafe', '$executeRawUnsafe', '$queryRaw', '$executeRaw']

async function findTsFiles(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      await findTsFiles(fullPath, files)
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(fullPath)
    }
  }
  return files
}

function analyzeCode(content, filePath) {
  const findings = []
  const lines = content.split('\n')

  for (const pattern of PATTERNS) {
    let idx = 0
    while ((idx = content.indexOf(pattern, idx)) !== -1) {
      const lineNum = content.substring(0, idx).split('\n').length
      const startLine = Math.max(0, lineNum - 20)
      const endLine = Math.min(lines.length, lineNum + 20)
      const context = lines.slice(startLine, endLine).join('\n')

      let classification = 'NEEDS_REVIEW'
      let reasoning = ''

      if (pattern.includes('Unsafe')) {
        if (content.substring(idx, idx + 500).match(/\$\{[^}]+\}/)) {
          classification = 'UNSAFE'
          reasoning = 'Template literal interpolation (${...}) with user input can lead to SQL injection'
        } else if (content.substring(idx, idx + 500).match(/`[^`]*\$\{[^}]+\}[^`]*`/)) {
          classification = 'UNSAFE'
          reasoning = 'String interpolation in raw SQL - variables may be user-controlled'
        } else if (content.substring(idx, idx + 500).match(/\$[0-9]+/)) {
          classification = 'SAFE'
          reasoning = 'Uses positional parameters ($1, $2, etc.) - parameterized query'
        } else if (content.substring(idx, idx + 500).match(/Prisma\.sql`/)) {
          classification = 'SAFE'
          reasoning = 'Uses Prisma.sql tagged template - Prisma escapes values'
        } else {
          classification = 'NEEDS_REVIEW'
          reasoning = 'Unsafe API used - manual review required to verify parameterization'
        }
      } else {
        if (content.substring(idx, idx + 500).match(/\$\{[^}]+\}/)) {
          classification = 'NEEDS_REVIEW'
          reasoning = 'queryRaw/executeRaw with template literals - verify Prisma.sql is used'
        } else {
          classification = 'SAFE'
          reasoning = 'Uses Prisma Prisma.sql tagged template - values are parameterized'
        }
      }

      findings.push({
        file: path.relative(path.join(__dirname, '../..'), filePath),
        line: lineNum,
        pattern,
        classification,
        reasoning,
        code: context.substring(0, 400) + (context.length > 400 ? '...' : '')
      })
      idx += pattern.length
    }
  }
  return findings
}

async function main() {
  console.error('Loopwell SQL Injection Analyzer - Phase 1, Task 4')
  const files = await findTsFiles(SRC_DIR)
  console.error('Scanning', files.length, 'TypeScript files')

  const allFindings = []
  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf-8')
    const findings = analyzeCode(content, filePath)
    allFindings.push(...findings)
  }

  const safe = allFindings.filter(f => f.classification === 'SAFE').length
  const unsafe = allFindings.filter(f => f.classification === 'UNSAFE').length
  const needsReview = allFindings.filter(f => f.classification === 'NEEDS_REVIEW').length

  const report = {
    totalSites: allFindings.length,
    safe,
    unsafe,
    needsReview,
    findings: allFindings
  }

  console.log(JSON.stringify(report, null, 2))

  console.error('\n--- Summary ---')
  console.error('Total call sites:', allFindings.length)
  console.error('SAFE:', safe)
  console.error('UNSAFE:', unsafe)
  console.error('NEEDS_REVIEW:', needsReview)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
