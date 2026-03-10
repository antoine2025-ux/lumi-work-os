import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Test Configuration for Loopwell
 * 
 * Server Modes:
 * - Local (fast): Uses dev server, can reuse existing with E2E_REUSE_SERVER=true
 * - CI (stable): Uses production build + start for consistency
 * 
 * Authentication:
 * - Local: Uses saved auth state from .auth/user.json (manual Google OAuth)
 * - CI: Uses /api/e2e-auth endpoint for test user authentication
 * 
 * Run: npm run test:e2e
 * Debug: npm run test:e2e:ui
 */

// Determine server mode
const isCI = !!process.env.CI
// Local: reuse only if E2E_REUSE_SERVER=true
const reuseServer = process.env.E2E_REUSE_SERVER === 'true'

// In CI, use production server for stability; locally use dev server for speed
const serverCommand = isCI 
  ? 'npm run start:e2e'  // Production build + start
  : 'npm run dev'        // Development server

// Use localhost - must match cookie domain from auth state
const serverUrl = 'http://localhost:3000'

export default defineConfig({
  testDir: './tests/e2e',
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: isCI,
  
  // Retry on CI only
  retries: isCI ? 2 : 0,
  
  // Limit parallel workers on CI for stability
  workers: isCI ? 1 : undefined,
  
  // Reporter configuration
  reporter: isCI 
    ? [['html', { open: 'never' }], ['github']] 
    : [['html', { open: 'on-failure' }]],
  
  // Shared settings for all projects
  use: {
    // Base URL for the app - use 127.0.0.1 for reliability
    baseURL: process.env.PLAYWRIGHT_BASE_URL || serverUrl,
    
    // Collect trace on first retry
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'on-first-retry',
  },

  // Configure projects for different scenarios
  projects: [
    // Setup project - handles authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Main tests with authenticated state (desktop only for now)
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use stored auth state
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Mobile viewport tests - disabled for initial setup
    // Uncomment when ready to test mobile
    // {
    //   name: 'mobile',
    //   use: { 
    //     ...devices['iPhone 14'],
    //     storageState: '.auth/user.json',
    //   },
    //   dependencies: ['setup'],
    // },
  ],

  // Web server configuration
  webServer: {
    command: serverCommand,
    url: serverUrl,
    // CI: always start fresh server for reproducibility
    // Local: reuse only if E2E_REUSE_SERVER=true
    reuseExistingServer: isCI ? false : reuseServer,
    // Timeout for server to start
    timeout: isCI ? 180 * 1000 : 120 * 1000, // 3 min CI, 2 min local
    // Ensure clean stdout/stderr
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
