import { test as setup, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const AUTH_FILE = '.auth/user.json'

/**
 * Authentication Setup for E2E Tests
 * 
 * Local Development:
 * - Reuses saved auth state from .auth/user.json
 * - If missing, run: npx playwright codegen --save-storage=.auth/user.json http://localhost:3000/login
 * 
 * CI Environment (E2E_AUTH_ENABLED=true):
 * - Calls /api/e2e-auth endpoint to create a test session
 * - Requires E2E_AUTH_SECRET environment variable
 */
setup('authenticate', async ({ request, baseURL }) => {
  const isE2EAuthEnabled = process.env.E2E_AUTH_ENABLED === 'true'
  const e2eAuthSecret = process.env.E2E_AUTH_SECRET
  
  // CI path: Use E2E auth endpoint
  if (isE2EAuthEnabled && e2eAuthSecret) {
    console.log('🔐 Using E2E auth endpoint for CI...')
    
    const response = await request.post(`${baseURL}/api/e2e-auth`, {
      headers: {
        'x-e2e-secret': e2eAuthSecret,
        'Content-Type': 'application/json',
      },
      data: {
        email: 'e2e@loopwell.test',
      },
    })
    
    if (!response.ok()) {
      const status = response.status()
      if (status === 404) {
        throw new Error(
          'E2E auth endpoint returned 404. Check that:\n' +
          '  1. E2E_AUTH_ENABLED=true is set\n' +
          '  2. NODE_ENV is not "production"\n' +
          '  3. E2E_AUTH_SECRET matches the server config\n' +
          '  4. The app is running and accessible'
        )
      }
      throw new Error(`E2E auth failed with status ${status}`)
    }
    
    // Save the storage state (cookies) to auth file
    const authDir = path.dirname(AUTH_FILE)
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true })
    }
    
    await request.storageState({ path: AUTH_FILE })
    console.log('✅ E2E auth session created and saved to', AUTH_FILE)
    return
  }
  
  // Local path: Check for existing auth file
  if (fs.existsSync(AUTH_FILE)) {
    // Validate the auth file has actual cookies
    try {
      const authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'))
      const hasCookies = authData.cookies && authData.cookies.length > 0
      const hasSessionCookie = authData.cookies?.some(
        (c: { name: string }) => c.name.includes('next-auth.session-token')
      )
      
      if (hasCookies && hasSessionCookie) {
        console.log('✅ Using existing auth state from', AUTH_FILE)
        return
      }
    } catch {
      // Invalid JSON, will regenerate
    }
  }
  
  // No valid auth state - provide instructions
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║  AUTH STATE NOT FOUND OR INVALID                                       ║
║                                                                         ║
║  To set up authentication for local E2E tests:                          ║
║                                                                         ║
║  1. Start the app: npm run dev                                          ║
║  2. Run: npx playwright codegen --save-storage=.auth/user.json \\        ║
║          http://localhost:3000/login                                    ║
║  3. Complete Google OAuth login in the browser                          ║
║  4. Close the browser when done                                         ║
║                                                                         ║
║  The auth state will be saved and reused for future test runs.          ║
╚═══════════════════════════════════════════════════════════════════════╝
  `)
  
  // Create empty auth file so tests can at least start (they'll fail on auth)
  const authDir = path.dirname(AUTH_FILE)
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }
  fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }))
  
  // In CI without E2E auth, this is a configuration error
  if (process.env.CI) {
    throw new Error(
      'Running in CI without E2E auth enabled. Set E2E_AUTH_ENABLED=true and E2E_AUTH_SECRET.'
    )
  }
})
