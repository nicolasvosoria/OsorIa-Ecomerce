import { describe, expect, it } from "vitest"
import {
  STORY_CONTENT_ALIGN_CLASS,
  STORY_IMAGE_POSITION_IMAGE_ORDER_CLASS,
  STORY_IMAGE_POSITION_TEXT_ORDER_CLASS,
  resolveStoryContentAlign,
  resolveStoryImagePosition,
} from "@/lib/sections/story-variant"

describe("resolveStoryImagePosition", () => {
  it("accepts every declared option", () => {
    expect(resolveStoryImagePosition("right")).toBe("right")
    expect(resolveStoryImagePosition("left")).toBe("left")
    expect(resolveStoryImagePosition("none")).toBe("none")
  })

  it("falls back to 'right' (today's default) for an invalid or missing value", () => {
    expect(resolveStoryImagePosition(undefined)).toBe("right")
    expect(resolveStoryImagePosition("center")).toBe("right")
  })

  it("orders the text block ahead of the image only when the image sits on the right", () => {
    expect(STORY_IMAGE_POSITION_TEXT_ORDER_CLASS.right).toBe("md:order-1")
    expect(STORY_IMAGE_POSITION_IMAGE_ORDER_CLASS.right).toBe("md:order-2")
  })

  it("orders the image ahead of the text block when the image sits on the left", () => {
    expect(STORY_IMAGE_POSITION_TEXT_ORDER_CLASS.left).toBe("md:order-2")
    expect(STORY_IMAGE_POSITION_IMAGE_ORDER_CLASS.left).toBe("md:order-1")
  })
})

describe("resolveStoryContentAlign", () => {
  it("accepts every declared option", () => {
    expect(resolveStoryContentAlign("left")).toBe("left")
    expect(resolveStoryContentAlign("center")).toBe("center")
  })

  it("falls back to 'left' (today's default) for an invalid or missing value", () => {
    expect(resolveStoryContentAlign(undefined)).toBe("left")
    expect(resolveStoryContentAlign("right")).toBe("left")
  })

  it("maps every alignment to a matching items/text-align class", () => {
    expect(STORY_CONTENT_ALIGN_CLASS.left).toBe("items-start text-left")
    expect(STORY_CONTENT_ALIGN_CLASS.center).toBe("items-center text-center")
  })
})
