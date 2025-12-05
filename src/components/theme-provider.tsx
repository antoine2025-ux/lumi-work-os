"use client"

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { ThemeColor, themeConfigs } from '@/types/theme'

interface ThemeContextType {
  theme: ThemeColor
  setTheme: (theme: ThemeColor) => void
  themeConfig: typeof themeConfigs[ThemeColor]
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Force dark mode - theme is always 'dark' and cannot be changed
const FORCED_THEME: ThemeColor = 'dark'

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always use dark theme - no state needed
  const theme: ThemeColor = FORCED_THEME

  // Apply dark theme on mount and ensure consistency
  useEffect(() => {
    // Clean up any existing 'light' theme preference
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('lumi-theme')
      if (savedTheme === 'light') {
        localStorage.removeItem('lumi-theme')
      }
    }
    
    // Always apply dark theme
    const config = themeConfigs[theme]
    const root = document.documentElement
    
    // Ensure dark class is present
    root.classList.add('dark')
    
    // Apply all theme variables
    root.style.setProperty('--primary', config.primary)
    root.style.setProperty('--primary-foreground', config.primaryForeground)
    root.style.setProperty('--secondary', config.secondary)
    root.style.setProperty('--secondary-foreground', config.secondaryForeground)
    root.style.setProperty('--accent', config.accent)
    root.style.setProperty('--accent-foreground', config.accentForeground)
    root.style.setProperty('--background', config.background)
    root.style.setProperty('--foreground', config.foreground)
    root.style.setProperty('--muted', config.muted)
    root.style.setProperty('--muted-foreground', config.mutedForeground)
    root.style.setProperty('--border', config.border)
    root.style.setProperty('--input', config.input)
    root.style.setProperty('--ring', config.ring)
    root.style.setProperty('--card', config.card)
    root.style.setProperty('--card-foreground', config.cardForeground)
    root.style.setProperty('--popover', config.popover)
    root.style.setProperty('--popover-foreground', config.popoverForeground)
    root.style.setProperty('--destructive', config.destructive)
    root.style.setProperty('--destructive-foreground', config.destructiveForeground)
  }, [])

  // No-op setTheme function - theme cannot be changed
  const setTheme = (_newTheme: ThemeColor) => {
    // Theme is forced to dark, do nothing
    // This function exists for backward compatibility with components that might call it
  }

  const value = {
    theme,
    setTheme,
    themeConfig: themeConfigs[theme],
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
