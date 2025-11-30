"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { ThemeColor, themeConfigs } from '@/types/theme'

interface ThemeContextType {
  theme: ThemeColor
  setTheme: (theme: ThemeColor) => void
  themeConfig: typeof themeConfigs[ThemeColor]
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize with saved theme or default to 'dark'
  const [theme, setThemeState] = useState<ThemeColor>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('lumi-theme') as ThemeColor
      if (savedTheme && themeConfigs[savedTheme]) {
        return savedTheme
      }
    }
    return 'dark'
  })

  // Apply saved theme immediately on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('lumi-theme') as ThemeColor
    const themeToApply = (savedTheme && themeConfigs[savedTheme]) ? savedTheme : 'dark'
    
    if (savedTheme !== themeToApply) {
      setThemeState(themeToApply)
    }
    
    // Apply theme immediately to avoid flash
    const config = themeConfigs[themeToApply]
    const root = document.documentElement
    const body = document.body
    
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
    
    // Apply background color to body
    body.style.backgroundColor = config.background
    body.style.color = config.foreground
    
    // Apply dark class for CSS selectors
    if (themeToApply === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [])

  const setTheme = (newTheme: ThemeColor) => {
    setThemeState(newTheme)
    localStorage.setItem('lumi-theme', newTheme)
    
    // Apply theme to CSS custom properties
    const config = themeConfigs[newTheme]
    const root = document.documentElement
    const body = document.body
    
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
    
    // Apply background color to body
    body.style.backgroundColor = config.background
    body.style.color = config.foreground
    
    // Apply dark class for CSS selectors
    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  // Apply theme on mount and when theme changes
  useEffect(() => {
    setTheme(theme)
  }, [theme])

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
