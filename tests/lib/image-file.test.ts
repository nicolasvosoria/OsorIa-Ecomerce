import { describe, expect, it } from "vitest"

import { IMAGE_UPLOAD_ACCEPT, validateImageFile } from "@/lib/images/image-file"

function fileOfType(type: string, sizeInBytes = 16) {
  return new File([new Uint8Array(sizeInBytes)], "foto.webp", { type })
}

describe("validateImageFile", () => {
  it("accepts every type the file picker offers", () => {
    for (const mimeType of IMAGE_UPLOAD_ACCEPT.split(",")) {
      expect(validateImageFile(fileOfType(mimeType), 1)).toBeNull()
    }
  })

  it("rejects a non-image and names the file", () => {
    const message = validateImageFile(fileOfType("text/plain"), 1)

    expect(message).toContain("foto.webp")
    expect(message).toContain("archivo de imagen válido")
  })

  it("rejects a file over the given limit and reports both sizes", () => {
    const message = validateImageFile(fileOfType("image/webp", 2 * 1024 * 1024), 1)

    expect(message).toContain("máximo de 1MB")
    expect(message).toContain("2.00MB")
  })

  it("takes the limit from the caller instead of guessing it from the file", () => {
    const twoMegabyteImage = fileOfType("image/webp", 2 * 1024 * 1024)

    expect(validateImageFile(twoMegabyteImage, 1)).not.toBeNull()
    expect(validateImageFile(twoMegabyteImage, 5)).toBeNull()
  })
})
