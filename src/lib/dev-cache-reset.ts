/**
 * Dev-only utility to reset all caches
 * This should only be used in development mode
 */

/**
 * Clear all React Query cache (client-side)
 * Call this from browser console or a dev component
 */
export function clearReactQueryCache(queryClient: any) {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Cache clearing is only available in development mode')
    return
  }

  try {
    // Clear all queries
    queryClient.clear()
    console.log('✅ React Query cache cleared')
  } catch (error) {
    console.error('❌ Failed to clear React Query cache:', error)
  }
}

/**
 * Clear all server-side caches via API
 */
export async function clearServerCache() {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Cache clearing is only available in development mode')
    return
  }

  try {
    const response = await fetch('/api/dev/clear-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to clear server cache')
    }

    const result = await response.json()
    console.log('✅ Server cache cleared:', result)
    return result
  } catch (error) {
    console.error('❌ Failed to clear server cache:', error)
    throw error
  }
}

/**
 * Clear all caches (both client and server)
 * Requires queryClient from useQueryClient() hook
 */
export async function clearAllCaches(queryClient: any) {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Cache clearing is only available in development mode')
    return
  }

  console.log('🔄 Clearing all caches...')

  // Clear client-side cache
  clearReactQueryCache(queryClient)

  // Clear server-side cache
  await clearServerCache()

  // Clear browser localStorage (optional - be careful!)
  // Uncomment if you want to clear localStorage too
  // localStorage.clear()
  // console.log('✅ localStorage cleared')

  // Clear browser sessionStorage (optional - be careful!)
  // Uncomment if you want to clear sessionStorage too
  // sessionStorage.clear()
  // console.log('✅ sessionStorage cleared')

  console.log('✅ All caches cleared!')
}

/**
 * Make clearAllCaches available globally in dev mode for console access
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__clearAllCaches = clearAllCaches
  console.log('💡 Dev utility: Use window.__clearAllCaches(queryClient) to clear all caches')
}

