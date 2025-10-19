export type ThemeColor = 'light-blue' | 'light-brown' | 'light-green' | 'dark-blue' | 'dark-brown' | 'dark-green'

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
  'light-blue': {
    name: 'Light Blue',
    value: 'light-blue',
    primary: '#3b82f6',
    primaryForeground: '#ffffff',
    secondary: '#e0f2fe',
    secondaryForeground: '#0c4a6e',
    accent: '#dbeafe',
    accentForeground: '#1e40af',
    background: '#f8fafc',
    foreground: '#0f172a',
    muted: '#f1f5f9',
    mutedForeground: '#475569',
    border: '#e2e8f0',
    input: '#f8fafc',
    ring: '#3b82f6',
    card: '#ffffff',
    cardForeground: '#0f172a',
    popover: '#ffffff',
    popoverForeground: '#0f172a',
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',
  },
  'light-brown': {
    name: 'Light Brown',
    value: 'light-brown',
    primary: '#8b5a3c',
    primaryForeground: '#ffffff',
    secondary: '#f5f0eb',
    secondaryForeground: '#6b4423',
    accent: '#f5f0eb',
    accentForeground: '#6b4423',
    background: '#f7f6f4',
    foreground: '#2c2c2c',
    muted: '#f8f7f5',
    mutedForeground: '#5a5a5a',
    border: '#e7e5e0',
    input: '#f7f6f4',
    ring: '#8b5a3c',
    card: '#fefdfb',
    cardForeground: '#2c2c2c',
    popover: '#fefdfb',
    popoverForeground: '#2c2c2c',
    destructive: '#dc2626',
    destructiveForeground: '#ffffff',
  },
  'light-green': {
    name: 'Light Green',
    value: 'light-green',
    primary: '#16a34a',
    primaryForeground: '#ffffff',
    secondary: '#dcfce7',
    secondaryForeground: '#166534',
    accent: '#bbf7d0',
    accentForeground: '#15803d',
    background: '#f7fef7',
    foreground: '#0f172a',
    muted: '#f0fdf4',
    mutedForeground: '#475569',
    border: '#e5e7eb',
    input: '#f7fef7',
    ring: '#16a34a',
    card: '#ffffff',
    cardForeground: '#0f172a',
    popover: '#ffffff',
    popoverForeground: '#0f172a',
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',
  },
  'dark-blue': {
    name: 'Dark Blue',
    value: 'dark-blue',
    primary: '#60a5fa',
    primaryForeground: '#1e293b',
    secondary: '#1e293b',
    secondaryForeground: '#f1f5f9',
    accent: '#334155',
    accentForeground: '#f1f5f9',
    background: '#0f172a',
    foreground: '#f8fafc',
    muted: '#1e293b',
    mutedForeground: '#cbd5e1',
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
  'dark-brown': {
    name: 'Dark Brown',
    value: 'dark-brown',
    primary: '#d4a574',
    primaryForeground: '#2c1810',
    secondary: '#2c1810',
    secondaryForeground: '#f5f0eb',
    accent: '#3d2817',
    accentForeground: '#f5f0eb',
    background: '#1a0f0a',
    foreground: '#fefdfb',
    muted: '#2c1810',
    mutedForeground: '#d4a574',
    border: '#3d2817',
    input: '#2c1810',
    ring: '#d4a574',
    card: '#2c1810',
    cardForeground: '#fefdfb',
    popover: '#2c1810',
    popoverForeground: '#fefdfb',
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',
  },
  'dark-green': {
    name: 'Dark Green',
    value: 'dark-green',
    primary: '#4ade80',
    primaryForeground: '#064e3b',
    secondary: '#064e3b',
    secondaryForeground: '#ecfdf5',
    accent: '#065f46',
    accentForeground: '#ecfdf5',
    background: '#022c22',
    foreground: '#f0fdf4',
    muted: '#064e3b',
    mutedForeground: '#6ee7b7',
    border: '#065f46',
    input: '#064e3b',
    ring: '#4ade80',
    card: '#064e3b',
    cardForeground: '#f0fdf4',
    popover: '#064e3b',
    popoverForeground: '#f0fdf4',
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',
  },
}
