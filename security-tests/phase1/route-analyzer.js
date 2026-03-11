#!/usr/bin/env node
/**
 * Loopwell API Route Security Analyzer
 * Phase 1, Task 1: Attack Surface Mapping
 * Analyzes all API routes for authentication patterns.
 */

const fs = require('fs').promises
const path = require('path')

const API_DIR = path.join(__dirname, '../../src/app/api')

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

function getRoutePath(filePath) {
  const relative = path.relative(path.join(__dirname, '../../src/app/api'), filePath)
  const routePath = '/api/' + relative.replace(/\/route\.ts$/, '').replace(/\\/g, '/')
  return routePath
}

function categorize(hasAuth, hasRbac, hasScoping, content, routePath) {
  const lower = content.toLowerCase()
  const pathLower = routePath.toLowerCase()

  // Dev/test routes
  if (pathLower.includes('/test') || pathLower.includes('/debug') || pathLower.includes('/dev') || pathLower.includes('/e2e')) {
    if (lower.includes('node_env') || lower.includes('process.env')) return 'DEV_GATED'
    return 'DEV_GATED'
  }

  // Cron/internal
  if (lower.includes('authorization') && lower.includes('bearer')) return 'CRON_PROTECTED'
  if (pathLower.includes('/cron') || pathLower.includes('/webhook') && !pathLower.includes('slack')) return 'CRON_PROTECTED'

  // Public by design
  if (pathLower.includes('/auth/signin') || pathLower.includes('/auth/csrf') || pathLower.includes('/auth/providers') ||
      pathLower.includes('/auth/session') || pathLower.includes('/health') || pathLower.includes('/waitlist') ||
      pathLower.includes('/oauth') || pathLower.includes('/trpc')) return 'PUBLIC_DESIGN'

  // Auth callback - public by design
  if (pathLower.includes('/auth/') && (pathLower.includes('callback') || pathLower.includes('signin'))) return 'PUBLIC_DESIGN'

  // Webhooks (Slack, etc.) - special handling
  if (pathLower.includes('slack') && pathLower.includes('webhook')) return 'CRON_PROTECTED'

  if (hasAuth && hasRbac && hasScoping) return 'AUTHENTICATED'
  if (hasAuth && !hasRbac) return 'PARTIAL_AUTH'
  if (hasAuth && !hasScoping) return 'PARTIAL_AUTH'
  if (hasAuth) return 'PARTIAL_AUTH'
  return 'UNKNOWN'
}

function getNotes(hasAuth, hasRbac, hasScoping, category) {
  const notes = []
  if (hasAuth && !hasRbac) notes.push('Missing assertAccess')
  if (hasAuth && !hasScoping) notes.push('Missing setWorkspaceContext')
  if (category === 'UNKNOWN' && !hasAuth) notes.push('No getUnifiedAuth - verify intentional')
  return notes.join('; ')
}

async function analyzeRouteFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8')
  const routePath = getRoutePath(filePath)

  const hasAuth = content.includes('getUnifiedAuth')
  const hasRbac = content.includes('assertAccess')
  const hasScoping = content.includes('setWorkspaceContext')

  const methods = []
  for (const m of HTTP_METHODS) {
    if (content.includes(`export async function ${m}`) || content.includes(`export function ${m}`)) {
      methods.push(m)
    }
  }
  if (methods.length === 0) methods.push('(none)')

  const category = categorize(hasAuth, hasRbac, hasScoping, content, routePath)
  const notes = getNotes(hasAuth, hasRbac, hasScoping, category)

  return {
    routePath,
    methods: methods.join(','),
    hasAuth,
    hasRbac,
    hasScoping,
    category,
    notes
  }
}

async function findRouteFiles(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await findRouteFiles(fullPath, files)
    } else if (entry.name === 'route.ts') {
      files.push(fullPath)
    }
  }
  return files
}

function escapeCsv(val) {
  if (val === undefined || val === null) return '""'
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return '"' + s + '"'
}

async function main() {
  console.error('Loopwell Route Analyzer - Phase 1, Task 1')
  console.error('Scanning:', API_DIR)

  const routeFiles = await findRouteFiles(API_DIR)
  console.error('Found', routeFiles.length, 'route files')

  const results = []
  for (const filePath of routeFiles) {
    try {
      const r = await analyzeRouteFile(filePath)
      results.push(r)
    } catch (err) {
      console.error('Error analyzing', filePath, err.message)
    }
  }

  // CSV header
  const headers = ['Route Path', 'Methods', 'Has Auth', 'Has RBAC', 'Has Scoping', 'Category', 'Notes']
  const rows = [headers.map(escapeCsv).join(',')]

  for (const r of results) {
    rows.push([
      r.routePath,
      r.methods,
      r.hasAuth ? 'yes' : 'no',
      r.hasRbac ? 'yes' : 'no',
      r.hasScoping ? 'yes' : 'no',
      r.category,
      r.notes
    ].map(escapeCsv).join(','))
  }

  const csv = rows.join('\n')
  console.log(csv)

  // Summary (to stderr so it doesn't pollute CSV)
  const byCategory = {}
  for (const r of results) {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1
  }
  const missingRbac = results.filter(r => r.hasAuth && !r.hasRbac).length
  const missingScoping = results.filter(r => r.hasAuth && !r.hasScoping).length

  console.error('\n--- Summary ---')
  console.error('Total routes:', results.length)
  console.error('By category:', JSON.stringify(byCategory, null, 2))
  console.error('Auth but missing RBAC:', missingRbac)
  console.error('Auth but missing Scoping:', missingScoping)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
