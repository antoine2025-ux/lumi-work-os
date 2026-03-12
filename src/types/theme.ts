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
    primary: '#6366F1',
    primaryForeground: '#ffffff',
    secondary: '#162032',
    secondaryForeground: '#F1F5F9',
    accent: 'hsl(222 35% 17%)',
    accentForeground: '#F1F5F9',
    background: 'hsl(222 47% 4%)',
    foreground: '#F1F5F9',
    muted: 'hsl(222 35% 15%)',
    mutedForeground: 'hsl(215 20% 60%)',
    border: 'hsl(222 25% 20%)',
    input: '#1E293B',
    ring: '#6366F1',
    card: 'hsl(222 40% 10%)',
    cardForeground: '#F1F5F9',
    popover: '#0F1729',
    popoverForeground: '#F1F5F9',
    destructive: '#DC2626',
    destructiveForeground: '#ffffff',
  },
}
