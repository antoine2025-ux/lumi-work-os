export type ThemeColor = 'light-blue' | 'light-brown' | 'light-green'

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
    mutedForeground: '#64748b',
    border: '#e2e8f0',
    input: '#f8fafc',
    ring: '#3b82f6',
  },
  'light-brown': {
    name: 'Light Brown',
    value: 'light-brown',
    primary: '#d97706',
    primaryForeground: '#ffffff',
    secondary: '#fef3c7',
    secondaryForeground: '#92400e',
    accent: '#fed7aa',
    accentForeground: '#c2410c',
    background: '#fefbf7',
    foreground: '#0f172a',
    muted: '#fef7ed',
    mutedForeground: '#78716c',
    border: '#e7e5e4',
    input: '#fefbf7',
    ring: '#d97706',
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
    mutedForeground: '#6b7280',
    border: '#e5e7eb',
    input: '#f7fef7',
    ring: '#16a34a',
  },
}
