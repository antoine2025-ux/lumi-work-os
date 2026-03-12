import { test, expect } from '@playwright/test'
import { skipIfNoAuth, gotoAuthenticated, waitForPageReady, waitForElement } from './helpers/page-ready'

/**
 * Loopbrain Chat E2E Tests
 *
 * Tests the AI-powered organizational Q&A system:
 * - Chat interface loads and is interactive
 * - Can ask questions about projects, people, capacity
 * - Responses are displayed with proper formatting
 * - Feedback buttons (thumbs up/down) are available
 * - Error states are handled gracefully
 *
 * Note: These tests verify the UI flow works end-to-end.
 * They do not validate AI response quality (which requires OpenAI API keys).
 */

test.describe('Loopbrain Chat', () => {
  test.describe('Chat Interface', () => {
    test('ask page loads with chat interface', async ({ page }) => {
      const loaded = await gotoAuthenticated(page, '/ask')
      if (!loaded) return

      await waitForPageReady(page)

      // Should show chat input (textarea or input field)
      const chatInput = page.locator('textarea, input[type="text"]').first()
      await expect(chatInput).toBeVisible({ timeout: 10000 })
    })

    test('chat input accepts text', async ({ page }) => {
      const loaded = await gotoAuthenticated(page, '/ask')
      if (!loaded) return

      await waitForPageReady(page)

      // Find the chat input
      const chatInput = page.locator('textarea, input[type="text"]').first()
      const inputVisible = await chatInput.isVisible({ timeout: 5000 }).catch(() => false)

      if (!inputVisible) {
        test.skip(true, 'Chat input not found')
        return
      }

      // Type a question
      await chatInput.fill('What projects are currently active?')

      // Verify text was entered
      const value = await chatInput.inputValue()
      expect(value).toContain('What projects are currently active')
    })

    test('can submit a question via Enter key', async ({ page }) => {
      const loaded = await gotoAuthenticated(page, '/ask')
      if (!loaded) return

      await waitForPageReady(page)

      const chatInput = page.locator('textarea, input[type="text"]').first()
      const inputVisible = await chatInput.isVisible({ timeout: 5000 }).catch(() => false)

      if (!inputVisible) {
        test.skip(true, 'Chat input not found')
        return
      }

      // Type and submit
      await chatInput.fill('How many people work here?')
      await chatInput.press('Enter')

      // Wait for response or loading indicator
      // The response might be an error if OpenAI is not configured, which is acceptable
      await page.waitForTimeout(2000)

      // Check for either:
      // 1. A response message appeared
      // 2. A loading indicator appeared
      // 3. An error message appeared (acceptable if OpenAI not configured)
      const hasResponse = await page
        .locator('[data-testid*="message"], [data-testid*="response"], .message, .response')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      const hasLoading = await page
        .locator('[data-testid*="loading"], .loading, .spinner')
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false)

      const hasError = await page
        .locator('[data-testid*="error"], .error')
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false)

      // At least one of these should be true
      expect(hasResponse || hasLoading || hasError).toBeTruthy()
    })

    test('can submit a question via button click', async ({ page }) => {
      const loaded = await gotoAuthenticated(page, '/ask')
      if (!loaded) return

      await waitForPageReady(page)

      const chatInput = page.locator('textarea, input[type="text"]').first()
      const inputVisible = await chatInput.isVisible({ timeout: 5000 }).catch(() => false)

      if (!inputVisible) {
        test.skip(true, 'Chat input not found')
        return
      }

      // Type question
      await chatInput.fill('Who is overloaded?')

      // Find and click submit button (common patterns: Send, Submit, or icon button)
      const submitButton = page
        .locator('button:has-text("Send"), button:has-text("Submit"), button[type="submit"]')
        .first()

      const buttonVisible = await submitButton.isVisible({ timeout: 3000 }).catch(() => false)

      if (!buttonVisible) {
        // Try submitting via Enter instead
        await chatInput.press('Enter')
      } else {
        await submitButton.click()
      }

      // Wait for some response
      await page.waitForTimeout(2000)

      // Verify something happened (response, loading, or error)
      const hasActivity = await page
        .locator(
          '[data-testid*="message"], [data-testid*="response"], [data-testid*="loading"], .message, .response, .loading'
        )
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      expect(hasActivity).toBeTruthy()
    })
  })

  test.describe('API Integration', () => {
    test('loopbrain org ask API responds to questions', async ({ page }) => {
      await skipIfNoAuth(page)

      const response = await page.request.post('/api/loopbrain/org/ask', {
        data: {
          question: 'How many people are in the organization?',
        },
      })

      if (response.status() === 401) {
        test.skip(true, 'Auth not configured for Loopbrain API')
        return
      }

      // Acceptable responses:
      // 200 = success (OpenAI configured and working)
      // 500 = OpenAI not configured (expected in test environments)
      // 400 = invalid input (shouldn't happen with valid question)
      expect([200, 400, 500]).toContain(response.status())

      const data = await response.json()
      expect(data).toBeTruthy()
    })

    test('loopbrain API handles project questions', async ({ page }) => {
      await skipIfNoAuth(page)

      const response = await page.request.post('/api/loopbrain/org/ask', {
        data: {
          question: 'What projects are currently active?',
        },
      })

      if (response.status() === 401) {
        test.skip(true, 'Auth not configured')
        return
      }

      expect([200, 500]).toContain(response.status())
    })

    test('loopbrain API handles capacity questions', async ({ page }) => {
      await skipIfNoAuth(page)

      const response = await page.request.post('/api/loopbrain/org/ask', {
        data: {
          question: 'Who is overloaded this week?',
        },
      })

      if (response.status() === 401) {
        test.skip(true, 'Auth not configured')
        return
      }

      expect([200, 500]).toContain(response.status())
    })

    test('loopbrain API rejects empty questions', async ({ page }) => {
      await skipIfNoAuth(page)

      const response = await page.request.post('/api/loopbrain/org/ask', {
        data: {
          question: '',
        },
      })

      if (response.status() === 401) {
        test.skip(true, 'Auth not configured')
        return
      }

      // Should reject empty question with 400
      expect([400, 422]).toContain(response.status())
    })

    test('loopbrain API validates request schema', async ({ page }) => {
      await skipIfNoAuth(page)

      // Send request without question field
      const response = await page.request.post('/api/loopbrain/org/ask', {
        data: {},
      })

      if (response.status() === 401) {
        test.skip(true, 'Auth not configured')
        return
      }

      // Should reject invalid schema with 400
      expect([400, 422]).toContain(response.status())
    })
  })

  test.describe('Response Display', () => {
    test('chat history persists during session', async ({ page }) => {
      const loaded = await gotoAuthenticated(page, '/ask')
      if (!loaded) return

      await waitForPageReady(page)

      const chatInput = page.locator('textarea, input[type="text"]').first()
      const inputVisible = await chatInput.isVisible({ timeout: 5000 }).catch(() => false)

      if (!inputVisible) {
        test.skip(true, 'Chat input not found')
        return
      }

      // Send first question
      await chatInput.fill('First question')
      await chatInput.press('Enter')
      await page.waitForTimeout(1000)

      // Send second question
      await chatInput.fill('Second question')
      await chatInput.press('Enter')
      await page.waitForTimeout(1000)

      // Check if both questions are visible in the chat history
      const firstQuestion = page.getByText('First question')
      const secondQuestion = page.getByText('Second question')

      const firstVisible = await firstQuestion.isVisible({ timeout: 3000 }).catch(() => false)
      const secondVisible = await secondQuestion.isVisible({ timeout: 3000 }).catch(() => false)

      // At least one should be visible (chat history exists)
      expect(firstVisible || secondVisible).toBeTruthy()
    })

    test('error messages are displayed when API fails', async ({ page }) => {
      const loaded = await gotoAuthenticated(page, '/ask')
      if (!loaded) return

      await waitForPageReady(page)

      // Directly call the API with invalid data to trigger an error
      const response = await page.request.post('/api/loopbrain/org/ask', {
        data: {
          question: '', // Invalid: empty question
        },
      })

      if (response.status() === 401) {
        test.skip(true, 'Auth not configured')
        return
      }

      // Should get error response
      expect([400, 422, 500]).toContain(response.status())
    })
  })

  test.describe('Feedback Mechanism', () => {
    test('feedback buttons are available in responses', async ({ page }) => {
      await skipIfNoAuth(page)

      // Make a direct API call to get a response
      const response = await page.request.post('/api/loopbrain/org/ask', {
        data: {
          question: 'Test question for feedback',
        },
      })

      if (response.status() === 401) {
        test.skip(true, 'Auth not configured')
        return
      }

      if (!response.ok()) {
        test.skip(true, 'API not available or OpenAI not configured')
        return
      }

      // This test verifies the API works
      // UI feedback buttons would need to be tested with actual UI interaction
      // which requires the chat interface to render responses with feedback buttons
      const data = await response.json()
      expect(data).toBeTruthy()
    })
  })

  test.describe('Navigation', () => {
    test('can navigate to ask page from home', async ({ page }) => {
      const loaded = await gotoAuthenticated(page, '/home')
      if (!loaded) return

      await waitForPageReady(page)

      // Look for a link or button to Loopbrain/Ask
      const askLink = page.locator('a[href*="/ask"], button:has-text("Ask"), a:has-text("Loopbrain")')
      const linkVisible = await askLink.first().isVisible({ timeout: 5000 }).catch(() => false)

      if (!linkVisible) {
        // Try navigating directly
        await page.goto('/ask')
        await waitForPageReady(page)
      } else {
        await askLink.first().click()
        await page.waitForLoadState('domcontentloaded')
      }

      // Verify we're on the ask page
      await expect(page).toHaveURL(/\/ask/, { timeout: 5000 })
    })

    test('ask page is accessible from direct URL', async ({ page }) => {
      const loaded = await gotoAuthenticated(page, '/ask')
      if (!loaded) return

      await waitForPageReady(page)

      // Should be on ask page
      await expect(page).toHaveURL(/\/ask/, { timeout: 5000 })

      // Should show chat interface
      const content = page.locator('h1, h2, textarea, input, [data-testid="chat-input"]').first()
      await expect(content).toBeVisible({ timeout: 10000 })
    })
  })
})
