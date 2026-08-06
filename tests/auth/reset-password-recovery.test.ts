import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupabaseBrowserClient, getSupabaseEcommerce } from '@/lib/supabase/client'
import { prepareAuthRedirect } from '@/lib/auth/prepare-auth-redirect'
import { mockSupabaseClient } from '../__mocks__/supabase'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: vi.fn(),
  getSupabaseEcommerce: vi.fn(),
}))

vi.mock('@/lib/auth/prepare-auth-redirect', () => ({
  prepareAuthRedirect: vi.fn(),
}))

import { resendConfirmationEmail, resetPassword } from '@/lib/supabase/auth-api'

describe('resetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(mockSupabaseClient as any)
    vi.mocked(getSupabaseEcommerce).mockReturnValue(mockSupabaseClient as any)
    vi.mocked(prepareAuthRedirect).mockResolvedValue({
      ok: true,
      redirectTo: 'https://tienda.osoria.help/auth/reset-password?intent=preview-token',
    })
    vi.mocked(mockSupabaseClient.auth.resetPasswordForEmail).mockResolvedValue({ error: null })
  })

  it('gates through prepareAuthRedirect with the recovery purpose and D8 path before calling GoTrue', async () => {
    const result = await resetPassword('ana@example.com', 'a-turnstile-token')

    expect(result.success).toBe(true)
    expect(prepareAuthRedirect).toHaveBeenCalledWith({
      email: 'ana@example.com',
      purpose: 'recovery',
      path: '/auth/reset-password',
      turnstileToken: 'a-turnstile-token',
    })
    expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith('ana@example.com', {
      redirectTo: 'https://tienda.osoria.help/auth/reset-password?intent=preview-token',
    })
  })

  it('never calls GoTrue when the gate rejects the request (Turnstile or D25 rate limit)', async () => {
    vi.mocked(prepareAuthRedirect).mockResolvedValue({ ok: false, reason: 'rate_limited' })

    const result = await resetPassword('ana@example.com', null)

    expect(result.success).toBe(false)
    expect(mockSupabaseClient.auth.resetPasswordForEmail).not.toHaveBeenCalled()
  })

  // D24: resetPasswordForEmail itself never reveals whether `email` belongs
  // to an account -- this wrapper must not add a distinguishing signal on
  // top of it. Same gate outcome, same GoTrue outcome -> identical response.
  it('returns the same response shape for a known-looking and an unknown-looking recipient', async () => {
    const forKnown = await resetPassword('known@example.com', null)
    const forUnknown = await resetPassword('unknown@example.com', null)

    expect(forKnown).toEqual(forUnknown)
  })
})

describe('resendConfirmationEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(mockSupabaseClient as any)
    vi.mocked(getSupabaseEcommerce).mockReturnValue(mockSupabaseClient as any)
    vi.mocked(prepareAuthRedirect).mockResolvedValue({
      ok: true,
      redirectTo: 'https://tienda.osoria.help/auth/callback?intent=preview-token',
    })
    vi.mocked(mockSupabaseClient.auth.resend).mockResolvedValue({ error: null })
  })

  it('gates through prepareAuthRedirect with the signup purpose and mints a fresh intent for the resend', async () => {
    const result = await resendConfirmationEmail('ana@example.com', null)

    expect(result.success).toBe(true)
    expect(prepareAuthRedirect).toHaveBeenCalledWith({
      email: 'ana@example.com',
      purpose: 'signup',
      path: '/auth/callback',
      turnstileToken: null,
    })
    expect(mockSupabaseClient.auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'ana@example.com',
      options: { emailRedirectTo: 'https://tienda.osoria.help/auth/callback?intent=preview-token' },
    })
  })

  it('never calls GoTrue when the gate rejects the request', async () => {
    vi.mocked(prepareAuthRedirect).mockResolvedValue({ ok: false, reason: 'rate_limited' })

    const result = await resendConfirmationEmail('ana@example.com', null)

    expect(result.success).toBe(false)
    expect(mockSupabaseClient.auth.resend).not.toHaveBeenCalled()
  })
})
