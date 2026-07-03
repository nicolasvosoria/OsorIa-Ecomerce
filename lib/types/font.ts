export interface AppFont {
  id: string
  font_name: string
  font_family: string
  google_font_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AppFontPairing {
  id: number
  pairing_name: string
  heading_font_name: string
  heading_font_family: string
  heading_google_font_url: string | null
  heading_font_axis: string | null
  body_font_name: string
  body_font_family: string
  body_google_font_url: string | null
  body_font_axis: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
