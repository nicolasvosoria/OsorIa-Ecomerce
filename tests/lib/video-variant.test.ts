import { describe, expect, it } from "vitest"
import { VIDEO_ASPECT_RATIO_CLASS, resolveVideoAspectRatio } from "@/lib/sections/video-variant"

describe("resolveVideoAspectRatio", () => {
  it("accepts every declared option", () => {
    expect(resolveVideoAspectRatio("16:9")).toBe("16:9")
    expect(resolveVideoAspectRatio("4:3")).toBe("4:3")
    expect(resolveVideoAspectRatio("1:1")).toBe("1:1")
    expect(resolveVideoAspectRatio("21:9")).toBe("21:9")
  })

  it("falls back to '16:9' (today's default) for an invalid or missing value", () => {
    expect(resolveVideoAspectRatio(undefined)).toBe("16:9")
    expect(resolveVideoAspectRatio("")).toBe("16:9")
    expect(resolveVideoAspectRatio("9:16")).toBe("16:9")
  })

  it("maps every aspect ratio to a matching Tailwind aspect class", () => {
    expect(VIDEO_ASPECT_RATIO_CLASS["16:9"]).toBe("aspect-video")
    expect(VIDEO_ASPECT_RATIO_CLASS["4:3"]).toBe("aspect-[4/3]")
    expect(VIDEO_ASPECT_RATIO_CLASS["1:1"]).toBe("aspect-square")
    expect(VIDEO_ASPECT_RATIO_CLASS["21:9"]).toBe("aspect-[21/9]")
  })
})
