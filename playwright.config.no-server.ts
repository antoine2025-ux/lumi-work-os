import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for running tests against an already-running dev server.
 * Use when: npm run dev (in another terminal) && npm run test:e2e:dev
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : [['html', { open: 'on-failure' }]],
  // No webServer - assumes server is already running on localhost:3000
})
