import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { mockSupabaseClient } from '../__mocks__/supabase'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: vi.fn(),
  getSupabaseEcommerce: vi.fn(),
}))

import { changeOwnPassword } from '@/lib/supabase/auth-api'

const SESSION_EMAIL = 'duena@tienda.test'

function signedInAs(email: string | null) {
  return { data: { user: email ? { id: 'user-1', email } : null }, error: null }
}

function reauthenticationRejects(error: { code?: string; status?: number; message: string }) {
  vi.mocked(mockSupabaseClient.auth.signInWithPassword).mockResolvedValue({
    data: { user: null, session: null },
    error,
  } as never)
}

function reauthenticationAccepts() {
  vi.mocked(mockSupabaseClient.auth.signInWithPassword).mockResolvedValue({
    data: { user: { id: 'user-1' }, session: { access_token: 'fresh' } },
    error: null,
  } as never)
}

describe('changeOwnPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(mockSupabaseClient as never)
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue(signedInAs(SESSION_EMAIL) as never)
    vi.mocked(mockSupabaseClient.auth.updateUser).mockResolvedValue({ error: null } as never)
  })

  // D21: sin esta puerta, una sesión viva prestada basta para dejar fuera al
  // dueño de la cuenta. La prueba es que la credencial nueva nunca sale hacia
  // Supabase cuando la actual no coincide.
  it('never reaches updateUser when the current password is wrong', async () => {
    reauthenticationRejects({
      code: 'invalid_credentials',
      status: 400,
      message: 'Invalid login credentials',
    })

    const result = await changeOwnPassword({
      currentPassword: 'la-que-no-es',
      newPassword: 'unaClaveNueva123',
    })

    expect(result).toEqual({ success: false, reason: 'wrongCurrentPassword' })
    expect(mockSupabaseClient.auth.updateUser).not.toHaveBeenCalled()
  })

  // Un intento fallido de re-autenticación no puede echar a quien ya estaba
  // dentro: auth-js solo escribe la sesión cuando la respuesta trae una.
  it('leaves the live session alone when the current password is wrong', async () => {
    reauthenticationRejects({
      code: 'invalid_credentials',
      status: 400,
      message: 'Invalid login credentials',
    })

    await changeOwnPassword({ currentPassword: 'la-que-no-es', newPassword: 'unaClaveNueva123' })

    expect(mockSupabaseClient.auth.signOut).not.toHaveBeenCalled()
  })

  // El correo sale de la sesión: si lo trajera el formulario, acertar la
  // contraseña de otra cuenta cambiaría la contraseña de esa otra cuenta.
  it('re-authenticates against the email of the live session', async () => {
    reauthenticationAccepts()

    await changeOwnPassword({ currentPassword: 'la-de-hoy', newPassword: 'unaClaveNueva123' })

    expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: SESSION_EMAIL,
      password: 'la-de-hoy',
    })
  })

  it('applies the new password once the current one checks out', async () => {
    reauthenticationAccepts()

    const result = await changeOwnPassword({
      currentPassword: 'la-de-hoy',
      newPassword: 'unaClaveNueva123',
    })

    expect(result).toEqual({ success: true })
    expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
      password: 'unaClaveNueva123',
    })
  })

  // Una caída o un rate limit no prueban nada sobre la contraseña, así que no
  // pueden contarse como "esa no es la tuya" ni perder la causa real.
  it('keeps the cause of a re-authentication failure that is not a wrong password', async () => {
    reauthenticationRejects({ status: 429, code: 'over_request_rate_limit', message: 'Too many requests' })

    const result = await changeOwnPassword({
      currentPassword: 'la-de-hoy',
      newPassword: 'unaClaveNueva123',
    })

    expect(result).toEqual({ success: false, reason: 'failed', error: 'Too many requests' })
    expect(mockSupabaseClient.auth.updateUser).not.toHaveBeenCalled()
  })

  it('reports a new password that equals the current one instead of a raw Supabase message', async () => {
    reauthenticationAccepts()
    vi.mocked(mockSupabaseClient.auth.updateUser).mockResolvedValue({
      error: { code: 'same_password', message: 'New password should be different from the old password.' },
    } as never)

    const result = await changeOwnPassword({
      currentPassword: 'la-de-hoy',
      newPassword: 'la-de-hoy',
    })

    expect(result).toEqual({ success: false, reason: 'samePassword' })
  })

  it('refuses to re-authenticate when there is no session to prove', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue(signedInAs(null) as never)

    const result = await changeOwnPassword({
      currentPassword: 'la-de-hoy',
      newPassword: 'unaClaveNueva123',
    })

    expect(result).toEqual({ success: false, reason: 'failed', error: 'No hay sesión activa' })
    expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled()
    expect(mockSupabaseClient.auth.updateUser).not.toHaveBeenCalled()
  })
})
