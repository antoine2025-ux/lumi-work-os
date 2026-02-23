"use client"

import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-lg bg-landing-surface-elevated border border-landing-border" />
    )
  }

  const currentTheme = theme === "system" ? resolvedTheme : theme
  const isDark = currentTheme === "dark"

  const handleClick = () => {
    const newTheme = isDark ? "light" : "dark"
    setTheme(newTheme)
  }

  return (
    <button
      onClick={handleClick}
      className="relative w-10 h-10 rounded-lg bg-landing-surface-elevated hover:bg-landing-accent/20 transition-all flex items-center justify-center border border-landing-border"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      type="button"
    >
      {isDark ? (
        <Moon className="w-5 h-5 text-landing-text transition-all" />
      ) : (
        <Sun className="w-5 h-5 text-landing-text transition-all" />
      )}
    </button>
  )
}
