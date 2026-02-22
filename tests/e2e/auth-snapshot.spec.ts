import { test, expect } from '@playwright/test'

/**
 * AUTH SNAPSHOT: Diagnostic test to capture auth state
 * 
 * Captures:
 * - Cookie names (NextAuth session token)
 * - Full /api/auth/session JSON (workspaceId, isFirstTime, etc.)
 * - Redirect behavior (visited URL → final URL)
 * - Protected API route behavior (/api/projects status + response)
 * 
 * Run with:
 * E2E_TEST_AUTH=true E2E_TEST_PASSWORD="your-password" \
 * npx playwright test tests/e2e/auth-snapshot.spec.ts --project=chromium
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD || 'e2e-test-password-123'

async function e2eLogin(page: import('@playwright/test').Page): Promise<boolean> {
  try {
    // Only if you have the /api/e2e-auth endpoint in your dev env
    const res = await page.request.post(`${BASE_URL}/api/e2e-auth`, {
      data: { password: E2E_PASSWORD },
    })
    
    if (!res.ok()) {
      const body = await res.text().catch(() => '')
      console.log(`E2E auth failed: ${res.status()} - ${body}`)
      return false
    }
    
    // Verify session was created
    const sessionResponse = await page.request.get(`${BASE_URL}/api/auth/session`)
    const session = await sessionResponse.json()
    return !!session?.user
  } catch (error) {
    console.log(`E2E auth error: ${error}`)
    return false
  }
}

test('AUTH SNAPSHOT: cookies + /api/auth/session + protected route behavior', async ({ page, context }) => {
  const output: string[] = []
  const log = (msg: string) => {
    console.log(msg)
    output.push(msg)
  }
  
  // Check if we have auth state
  const sessionCheck = await page.request.get(`${BASE_URL}/api/auth/session`)
  const initialSession = await sessionCheck.json().catch(() => ({}))
  const hasInitialAuth = !!initialSession?.user
  
  // 1) Login via E2E endpoint (skip if you want manual login)
  if (process.env.E2E_TEST_AUTH === 'true' && !hasInitialAuth) {
    log('=== LOGGING IN VIA E2E AUTH ===')
    const loginSuccess = await e2eLogin(page)
    if (!loginSuccess) {
      log('⚠️ E2E login failed - continuing without auth')
      log('⚠️ If you are manually logged in, the test will capture that state')
    } else {
      log('✅ E2E login successful')
    }
  } else if (!hasInitialAuth) {
    log('ℹ️ E2E_TEST_AUTH not set and no auth state found')
    log('ℹ️ If browser is visible (headless: false), you can log in manually now')
    log('ℹ️ Waiting 10 seconds for manual login (if needed)...')
    await page.waitForTimeout(10000)
    
    // Check again after wait
    const sessionCheck2 = await page.request.get(`${BASE_URL}/api/auth/session`)
    const sessionAfterWait = await sessionCheck2.json().catch(() => ({}))
    if (sessionAfterWait?.user) {
      log('✅ Manual login detected!')
    } else {
      log('⚠️ Still no auth - test will continue but may show unauthenticated state')
    }
  } else {
    log('✅ Using existing auth state')
  }

  // 2) Capture cookies
  const cookies = await context.cookies(BASE_URL)
  const cookieNames = cookies.map(c => c.name).sort()
  log('\n=== COOKIE NAMES ===')
  log(cookieNames.join(', ') || '(no cookies)')
  
  // Check specifically for NextAuth cookies
  const nextAuthCookies = cookies.filter(c => 
    c.name.includes('next-auth') || c.name.includes('session-token')
  )
  log('\n=== NEXTAUTH COOKIE NAMES (not values) ===')
  if (nextAuthCookies.length === 0) {
    log('  (no NextAuth cookies found)')
  } else {
    nextAuthCookies.forEach(c => {
      log(`  - ${c.name} (${c.httpOnly ? 'httpOnly' : 'not httpOnly'}, ${c.secure ? 'secure' : 'not secure'})`)
    })
  }

  // 3) Capture session JSON
  log('\n=== /api/auth/session ===')
  const sessionRes = await page.request.get(`${BASE_URL}/api/auth/session`)
  log(`Status: ${sessionRes.status()}`)
  
  const sessionJson = await sessionRes.json().catch(() => null)
  
  if (sessionJson && Object.keys(sessionJson).length > 0) {
    log('\n=== SESSION JSON (full) ===')
    log(JSON.stringify(sessionJson, null, 2))
    
    log('\n=== SESSION JSON (key fields only) ===')
    log(`  user.id: ${sessionJson?.user?.id || 'MISSING'}`)
    log(`  user.email: ${sessionJson?.user?.email || 'MISSING'}`)
    log(`  user.workspaceId: ${sessionJson?.user?.workspaceId || 'MISSING'}`)
    log(`  user.isFirstTime: ${sessionJson?.user?.isFirstTime ?? 'MISSING'}`)
    log(`  user.role: ${sessionJson?.user?.role || 'MISSING'}`)
    log(`  expires: ${sessionJson?.expires || 'MISSING'}`)
  } else {
    log('❌ No session found (user not logged in)')
  }

  // 4) Probe a protected route behavior
  log('\n=== VISITING /home ===')
  await page.goto(`${BASE_URL}/home`, { waitUntil: 'domcontentloaded' })
  
  // Wait a bit for any redirects
  await page.waitForTimeout(2000)
  
  const finalUrl = page.url()
  log(`Final URL: ${finalUrl}`)
  
  if (finalUrl.includes('/login')) {
    log('  → Redirected to /login (unauthenticated)')
  } else if (finalUrl.includes('/welcome')) {
    log('  → Redirected to /welcome (no workspace)')
  } else if (finalUrl.includes('/home')) {
    log('  → Stayed on /home (authenticated with workspace)')
  } else {
    log(`  → Ended up at: ${finalUrl}`)
  }

  // 5) Check projects API (if exists)
  log('\n=== /api/projects ===')
  const projectsRes = await page.request.get(`${BASE_URL}/api/projects`)
  log(`Status: ${projectsRes.status()}`)
  
  const contentType = projectsRes.headers()['content-type'] || ''
  log(`Content-Type: ${contentType}`)
  
  let bodyText = ''
  try {
    if (contentType.includes('application/json')) {
      const bodyJson = await projectsRes.json()
      bodyText = JSON.stringify(bodyJson, null, 2)
    } else {
      bodyText = await projectsRes.text()
    }
  } catch (e) {
    bodyText = `Failed to read response: ${e}`
  }
  
  log('\n=== /api/projects body (first 1000 chars) ===')
  log(bodyText.slice(0, 1000))
  if (bodyText.length > 1000) {
    log(`\n... (truncated, total length: ${bodyText.length} chars)`)
  }

  // 6) Additional diagnostic: Check user-status API
  log('\n=== /api/auth/user-status ===')
  const userStatusRes = await page.request.get(`${BASE_URL}/api/auth/user-status`)
  log(`Status: ${userStatusRes.status()}`)
  
  try {
    const userStatusJson = await userStatusRes.json()
    log('\n=== /api/auth/user-status JSON ===')
    log(JSON.stringify(userStatusJson, null, 2))
  } catch (e) {
    log(`Failed to parse user-status JSON: ${e}`)
  }

  // 7) Summary for quick diagnosis
  log('\n=== DIAGNOSTIC SUMMARY ===')
  const hasSession = !!sessionJson?.user
  const hasWorkspaceId = !!sessionJson?.user?.workspaceId
  const isFirstTime = sessionJson?.user?.isFirstTime === true
  
  log(`Has session: ${hasSession ? 'YES' : 'NO'}`)
  log(`Has workspaceId in session: ${hasWorkspaceId ? 'YES' : 'NO'}`)
  log(`isFirstTime flag: ${isFirstTime ? 'TRUE' : 'FALSE'}`)
  log(`Final URL after /home: ${finalUrl}`)
  log(`/api/projects status: ${projectsRes.status()}`)
  
  // Potential issues
  if (hasSession && !hasWorkspaceId && !isFirstTime) {
    log('\n⚠️ POTENTIAL ISSUE: Has session but no workspaceId and isFirstTime=false')
    log('   → JWT may not have workspaceId, or session callback not copying it')
  }
  
  if (hasSession && isFirstTime && finalUrl.includes('/home')) {
    log('\n⚠️ POTENTIAL ISSUE: isFirstTime=true but stayed on /home')
    log('   → Middleware workspace check may not be working')
  }
  
  if (hasSession && hasWorkspaceId && finalUrl.includes('/welcome')) {
    log('\n⚠️ POTENTIAL ISSUE: Has workspaceId but redirected to /welcome')
    log('   → Middleware may be using stale isFirstTime flag')
  }
  
  if (projectsRes.status() === 401 && hasSession) {
    log('\n⚠️ POTENTIAL ISSUE: Authenticated but /api/projects returns 401')
    log('   → getUnifiedAuth may be failing to resolve workspaceId')
  }
  
  // Save output to file
  const fs = await import('fs')
  const path = await import('path')
  const outputPath = path.join(process.cwd(), 'evidence', 'auth-snapshot-output.txt')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, output.join('\n'))
  log(`\n✅ Full output saved to: ${outputPath}`)
})
