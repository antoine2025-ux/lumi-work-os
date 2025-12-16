// Development Configuration
// This file centralizes all development mode settings

export const DEV_CONFIG = {
  // Enable development mode bypasses
  ENABLE_DEV_LOGIN: process.env.ALLOW_DEV_LOGIN === 'true',
  
  // Development flags
  FLAGS: {
    BYPASS_AUTH: process.env.ALLOW_DEV_LOGIN === 'true',
    MOCK_SOCKET: process.env.NEXT_PUBLIC_ENABLE_SOCKET_IO !== 'true',
    USE_NEW_LAYOUT: process.env.NEXT_PUBLIC_USE_NEW_LAYOUT === 'true',
    ENABLE_ASSISTANT: process.env.ENABLE_ASSISTANT === 'true'
  }
}

// Helper function to check if we're in development mode
export function isDevMode(): boolean {
  return DEV_CONFIG.ENABLE_DEV_LOGIN && process.env.NODE_ENV === 'development'
}

// Helper function to get development user email
export function getDevUserEmail(): string {
  return process.env.DEV_USER_EMAIL || 'dev@lumi.local'
}

// Helper function to get development user name
export function getDevUserName(): string {
  return process.env.DEV_USER_NAME || 'Development User'
}
