export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  foreground: string
  card: string
  cardForeground: string
  border: string
  muted: string
  mutedForeground: string
}

export interface AppTheme {
  id: string
  theme_name: string
  colors: ThemeColors
  is_active: boolean
  created_at: string
  updated_at: string
  theme_fingerprint?: string
  theme_version_id?: string | null
  theme_published_at?: string | null
  store_id?: string | null
}
