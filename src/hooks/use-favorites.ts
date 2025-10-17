import { useState, useEffect } from 'react'

interface FavoritePage {
  id: string
  createdAt: string
  page: {
    id: string
    title: string
    slug: string
    excerpt: string | null
    category: string
    tags: string[]
    createdAt: string
    updatedAt: string
    workspace?: {
      id: string
      name: string
      slug: string
    }
  }
}

interface UseFavoritesReturn {
  favorites: FavoritePage[]
  isLoading: boolean
  error: string | null
  addToFavorites: (pageId: string) => Promise<boolean>
  removeFromFavorites: (pageId: string) => Promise<boolean>
  isFavorited: (pageId: string) => boolean
  refreshFavorites: () => Promise<void>
}

export function useFavorites(): UseFavoritesReturn {
  const [favorites, setFavorites] = useState<FavoritePage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load favorites on mount
  useEffect(() => {
    loadFavorites()
    
    // Listen for favorites updates
    const handleFavoritesUpdate = () => {
      loadFavorites()
    }
    
    window.addEventListener('favoritesUpdated', handleFavoritesUpdate)
    
    return () => {
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdate)
    }
  }, [])

  const loadFavorites = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/wiki/favorites')
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication required')
          return
        }
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setError(errorData.error || 'Failed to load favorites')
        return
      }
      
      const data = await response.json()
      
      if (data.success) {
        setFavorites(data.favorites)
      } else {
        setError(data.error || 'Failed to load favorites')
      }
    } catch (err) {
      setError('Failed to load favorites')
      console.error('Error loading favorites:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const addToFavorites = async (pageId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/wiki/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pageId }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Add to local state
        setFavorites(prev => [data.favorite, ...prev])
        return true
      } else {
        setError(data.error || 'Failed to add to favorites')
        return false
      }
    } catch (err) {
      setError('Failed to add to favorites')
      console.error('Error adding to favorites:', err)
      return false
    }
  }

  const removeFromFavorites = async (pageId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/wiki/favorites?pageId=${pageId}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Remove from local state
        setFavorites(prev => prev.filter(fav => fav.page.id !== pageId))
        return true
      } else {
        setError(data.error || 'Failed to remove from favorites')
        return false
      }
    } catch (err) {
      setError('Failed to remove from favorites')
      console.error('Error removing from favorites:', err)
      return false
    }
  }

  const isFavorited = (pageId: string): boolean => {
    return favorites.some(fav => fav.page.id === pageId)
  }

  const refreshFavorites = async () => {
    await loadFavorites()
  }

  return {
    favorites,
    isLoading,
    error,
    addToFavorites,
    removeFromFavorites,
    isFavorited,
    refreshFavorites,
  }
}

// Hook for checking if a specific page is favorited
export function useFavoriteStatus(pageId: string) {
  const [isFavorited, setIsFavorited] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (pageId) {
      checkFavoriteStatus()
    }
  }, [pageId])

  const checkFavoriteStatus = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/wiki/favorites/check?pageId=${pageId}`)
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication required')
          return
        }
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setError(errorData.error || 'Failed to check favorite status')
        return
      }
      
      const data = await response.json()
      
      if (data.success) {
        setIsFavorited(data.isFavorited)
      } else {
        setError(data.error || 'Failed to check favorite status')
      }
    } catch (err) {
      setError('Failed to check favorite status')
      console.error('Error checking favorite status:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleFavorite = async (): Promise<boolean> => {
    try {
      if (isFavorited) {
        const response = await fetch(`/api/wiki/favorites?pageId=${pageId}`, {
          method: 'DELETE',
        })
        const data = await response.json()
        
        if (data.success) {
          setIsFavorited(false)
          // Trigger a custom event to refresh favorites list
          window.dispatchEvent(new CustomEvent('favoritesUpdated'))
          return true
        } else {
          setError(data.error || 'Failed to remove from favorites')
          return false
        }
      } else {
        const response = await fetch('/api/wiki/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pageId }),
        })
        const data = await response.json()
        
        if (data.success) {
          setIsFavorited(true)
          // Trigger a custom event to refresh favorites list
          window.dispatchEvent(new CustomEvent('favoritesUpdated'))
          return true
        } else {
          setError(data.error || 'Failed to add to favorites')
          return false
        }
      }
    } catch (err) {
      setError('Failed to toggle favorite')
      console.error('Error toggling favorite:', err)
      return false
    }
  }

  return {
    isFavorited,
    isLoading,
    error,
    toggleFavorite,
    refresh: checkFavoriteStatus,
  }
}
