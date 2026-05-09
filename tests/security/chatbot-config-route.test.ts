import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

import { POST } from "@/app/api/chatbot-config/route"
import { requireAdminUser } from "@/lib/supabase/admin-route-auth"

const { createClient, cookies } = vi.hoisted(() => ({
  createClient: vi.fn(),
  cookies: vi.fn(),
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}))

vi.mock("next/headers", () => ({
  cookies,
}))

vi.mock("@/lib/supabase/admin-route-auth", () => ({
  requireAdminUser: vi.fn(),
}))

const mockedRequireAdminUser = vi.mocked(requireAdminUser)

function makeCookieStore(storeId = "store-123") {
  return {
    get: vi.fn((name: string) => {
      if (name === "store_id") return { value: storeId }
      return undefined
    }),
    set: vi.fn(),
  }
}

describe("chatbot config route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
    cookies.mockResolvedValue(makeCookieStore())
  })

  it("rejects non-admin requests before touching chatbot persistence", async () => {
    mockedRequireAdminUser.mockResolvedValue({
      error: "Acceso denegado",
      status: 403,
    })

    const ecommerceClient = { from: vi.fn() }
    createClient.mockReturnValue({
      schema: vi.fn().mockReturnValue(ecommerceClient),
    })

    const response = await POST(
      new NextRequest("http://localhost/api/chatbot-config", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer preview-token",
        },
        body: JSON.stringify({
          config: {
            assistantGuide: "Guía privada",
            tone: "friendly",
          },
        }),
      }),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: "Acceso denegado" })
    expect(mockedRequireAdminUser).toHaveBeenCalledTimes(1)
    expect(ecommerceClient.from).not.toHaveBeenCalled()
  })
})
