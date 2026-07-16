import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { mockSupabaseClient } from '../__mocks__/supabase'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: vi.fn(),
  getSupabaseEcommerce: vi.fn(),
}))

import { updatePassword } from '@/lib/supabase/auth-api'

describe('updatePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(mockSupabaseClient as any)
  })

  it('succeeds when Supabase accepts the new password', async () => {
    vi.mocked(mockSupabaseClient.auth.updateUser).mockResolvedValue({ error: null } as any)

    const result = await updatePassword('unaClaveNueva123')

    expect(result).toEqual({ success: true })
    expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({ password: 'unaClaveNueva123' })
  })

  // supabase-js recent versions expose error.code === 'same_password'. This must surface
  // as a distinguishable code so callers (force-password-change) can treat a retry against
  // an already-applied change as success instead of a dead end.
  it('surfaces code "same_password" when error.code says so', async () => {
    vi.mocked(mockSupabaseClient.auth.updateUser).mockResolvedValue({
      error: { code: 'same_password', message: 'New password should be different from the old password.' },
    } as any)

    const result = await updatePassword('mismaClave')

    expect(result.success).toBe(false)
    expect(result.code).toBe('same_password')
  })

  // Fallback for supabase-js versions that don't set error.code: match the message, since
  // Supabase's auth error messages are always English regardless of app locale.
  it('surfaces code "same_password" from the message when error.code is absent', async () => {
    vi.mocked(mockSupabaseClient.auth.updateUser).mockResolvedValue({
      error: { message: 'New password should be different from the old password.' },
    } as any)

    const result = await updatePassword('mismaClave')

    expect(result.success).toBe(false)
    expect(result.code).toBe('same_password')
  })

  it('does not set code for unrelated errors', async () => {
    vi.mocked(mockSupabaseClient.auth.updateUser).mockResolvedValue({
      error: { message: 'Network error' },
    } as any)

    const result = await updatePassword('unaClaveNueva123')

    expect(result.success).toBe(false)
    expect(result.code).toBeUndefined()
    expect(result.error).toBe('Network error')
  })

  // The client used to cut the request off after 10s even though the server could still
  // apply the change; raised to 30s so slower requests get a real chance to resolve
  // before the client gives up on them.
  it('waits up to 30s before timing out', async () => {
    vi.useFakeTimers()
    vi.mocked(mockSupabaseClient.auth.updateUser).mockReturnValue(new Promise(() => {}) as any)

    const pending = updatePassword('unaClaveNueva123')

    await vi.advanceTimersByTimeAsync(10000)
    let settled = false
    pending.then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(20000)
    const result = await pending

    expect(result.success).toBe(false)
    expect(result.error).toContain('Timeout')

    vi.useRealTimers()
  })
})
