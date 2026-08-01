import { beforeEach, describe, expect, it, vi } from "vitest"

// Las actions de /auth/cuenta son endpoints públicos: la sesión y la capa de
// datos se aíslan para probar exactamente eso — de dónde sale el user_id, qué
// entra y qué no llega nunca a escribirse.
const {
  getSupabaseAuthClientMock,
  revalidatePathMock,
  upsertAccountProfileMock,
  createUserAddressMock,
  updateUserAddressMock,
  deleteUserAddressMock,
  setDefaultUserAddressMock,
} = vi.hoisted(() => ({
  getSupabaseAuthClientMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  upsertAccountProfileMock: vi.fn(),
  createUserAddressMock: vi.fn(),
  updateUserAddressMock: vi.fn(),
  deleteUserAddressMock: vi.fn(),
  setDefaultUserAddressMock: vi.fn(),
}))

vi.mock("@/lib/supabase/admin-route-auth", () => ({
  getSupabaseAuthClient: getSupabaseAuthClientMock,
}))

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }))

vi.mock("@/lib/supabase/account-profile-api", () => ({
  upsertAccountProfile: upsertAccountProfileMock,
}))

vi.mock("@/lib/supabase/user-addresses-api", () => ({
  createUserAddress: createUserAddressMock,
  updateUserAddress: updateUserAddressMock,
  deleteUserAddress: deleteUserAddressMock,
  setDefaultUserAddress: setDefaultUserAddressMock,
}))

import {
  createSavedAddress,
  deleteSavedAddress,
  saveAccountProfile,
  setDefaultSavedAddress,
  updateSavedAddress,
} from "@/app/auth/cuenta/actions"

const ADDRESS_ID = "11111111-2222-4333-8444-555555555555"

function signedInAs(user: { id: string; email?: string } | null) {
  getSupabaseAuthClientMock.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user } }) },
  })
}

const ADDRESS_FORM = {
  label: "  Casa  ",
  addressLine1: "  Calle 10 # 4-5 ",
  city: "Bogotá",
  postalCode: "",
  country: "",
}

describe("account actions without a session", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signedInAs(null)
  })

  it.each([
    ["saveAccountProfile", () => saveAccountProfile({ firstName: "Ana", lastName: "", phone: "" })],
    ["createSavedAddress", () => createSavedAddress(ADDRESS_FORM)],
    ["deleteSavedAddress", () => deleteSavedAddress({ addressId: ADDRESS_ID })],
    ["setDefaultSavedAddress", () => setDefaultSavedAddress({ addressId: ADDRESS_ID })],
  ])("%s writes nothing for an anonymous caller", async (_name, callAction) => {
    const result = await callAction()

    expect(result).toEqual({ success: false, error: expect.stringContaining("sesión") })
    expect(upsertAccountProfileMock).not.toHaveBeenCalled()
    expect(createUserAddressMock).not.toHaveBeenCalled()
    expect(deleteUserAddressMock).not.toHaveBeenCalled()
    expect(setDefaultUserAddressMock).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })
})

describe("saveAccountProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signedInAs({ id: "owner-1", email: "duena@tienda.test" })
  })

  // El user_id y el correo salen de la cookie, nunca del formulario (D18).
  it("writes the session's own profile with the session's email", async () => {
    expect(
      await saveAccountProfile({ firstName: " Ana ", lastName: "Osorio", phone: " 3001234567 " }),
    ).toEqual({ success: true })

    expect(upsertAccountProfileMock).toHaveBeenCalledWith(
      {
        userId: "owner-1",
        email: "duena@tienda.test",
        profile: { firstName: "Ana", lastName: "Osorio", phone: "3001234567" },
      },
      expect.anything(),
    )
  })

  it("stores a blank field as absent instead of as an empty string", async () => {
    await saveAccountProfile({ firstName: "Ana", lastName: "   ", phone: "" })

    expect(upsertAccountProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({ profile: { firstName: "Ana", lastName: null, phone: null } }),
      expect.anything(),
    )
  })

  it("refreshes the account page once the profile is saved", async () => {
    await saveAccountProfile({ firstName: "Ana", lastName: "", phone: "" })

    expect(revalidatePathMock).toHaveBeenCalledWith("/auth/cuenta")
  })

  it("names the failure the data layer reported instead of a generic one", async () => {
    upsertAccountProfileMock.mockRejectedValue(new Error("permission denied for user_profiles"))

    expect(await saveAccountProfile({ firstName: "Ana", lastName: "", phone: "" })).toEqual({
      success: false,
      error: "permission denied for user_profiles",
    })
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })
})

describe("saved address actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signedInAs({ id: "owner-1", email: "duena@tienda.test" })
  })

  it("creates the address for the session's owner, trimmed and with the default country", async () => {
    expect(await createSavedAddress(ADDRESS_FORM)).toEqual({ success: true })

    expect(createUserAddressMock).toHaveBeenCalledWith(
      {
        userId: "owner-1",
        draft: {
          label: "Casa",
          addressLine1: "Calle 10 # 4-5",
          city: "Bogotá",
          postalCode: null,
          country: "Colombia",
        },
      },
      expect.anything(),
    )
  })

  it("rejects an address with no street line, before touching the database", async () => {
    const result = await createSavedAddress({ ...ADDRESS_FORM, addressLine1: "   " })

    expect(result.success).toBe(false)
    expect(createUserAddressMock).not.toHaveBeenCalled()
  })

  it("edits an address by id for the session's owner", async () => {
    await updateSavedAddress({ addressId: ADDRESS_ID, draft: ADDRESS_FORM })

    expect(updateUserAddressMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "owner-1", addressId: ADDRESS_ID }),
      expect.anything(),
    )
  })

  it("rejects an address id that is not one, before touching the database", async () => {
    const result = await deleteSavedAddress({ addressId: "../../otro" })

    expect(result.success).toBe(false)
    expect(deleteUserAddressMock).not.toHaveBeenCalled()
  })

  it("switches the default for the session's owner", async () => {
    await setDefaultSavedAddress({ addressId: ADDRESS_ID })

    expect(setDefaultUserAddressMock).toHaveBeenCalledWith(
      { userId: "owner-1", addressId: ADDRESS_ID },
      expect.anything(),
    )
  })

  it("names the failure the data layer reported when the address is not the owner's", async () => {
    deleteUserAddressMock.mockRejectedValue(new Error("Esa dirección ya no existe en tu libreta."))

    expect(await deleteSavedAddress({ addressId: ADDRESS_ID })).toEqual({
      success: false,
      error: "Esa dirección ya no existe en tu libreta.",
    })
  })
})
