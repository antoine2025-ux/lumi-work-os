export type ThemeColor = 'light' | 'dark'

export interface ThemeConfig {
  name: string
  value: ThemeColor
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  accent: string
  accentForeground: string
  background: string
  foreground: string
  muted: string
  mutedForeground: string
  border: string
  input: string
  ring: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  destructive: string
  destructiveForeground: string
}

export const themeConfigs: Record<ThemeColor, ThemeConfig> = {
  'light': {
    name: 'Light',
    value: 'light',
    primary: '#3b82f6',
    primaryForeground: '#ffffff',
    secondary: '#f1f5f9',
    secondaryForeground: '#0f172a',
    accent: '#f1f5f9',
    accentForeground: '#0f172a',
    background: '#ffffff',
    foreground: '#0f172a',
    muted: '#f8fafc',
    mutedForeground: '#64748b',
    border: '#e2e8f0',
    input: '#ffffff',
    ring: '#3b82f6',
    card: '#ffffff',
    cardForeground: '#0f172a',
    popover: '#ffffff',
    popoverForeground: '#0f172a',
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',
  },
  'dark': {
    name: 'Dark',
    value: 'dark',
    primary: '#60a5fa',
    primaryForeground: '#0f172a',
    secondary: '#1e293b',
    secondaryForeground: '#f8fafc',
    accent: '#1e293b',
    accentForeground: '#f8fafc',
    background: '#0f172a',
    foreground: '#f8fafc',
    muted: '#1e293b',
    mutedForeground: '#94a3b8',
    border: '#334155',
    input: '#1e293b',
    ring: '#60a5fa',
    card: '#1e293b',
    cardForeground: '#f8fafc',
    popover: '#1e293b',
    popoverForeground: '#f8fafc',
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',
  },
}
