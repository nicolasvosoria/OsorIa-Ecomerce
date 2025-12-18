export type UserRole = 'user' | 'admin'

export interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role?: UserRole
  created_at?: string
  updated_at?: string
}

export interface AuthResult {
  success: boolean
  error?: string
  user?: UserProfile
  emailSent?: boolean
}

