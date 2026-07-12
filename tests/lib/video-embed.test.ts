import { describe, expect, it } from "vitest"
import { parseVideoEmbed } from "@/lib/sections/video-embed"

describe("parseVideoEmbed", () => {
  it("builds a YouTube embed src from a watch URL", () => {
    expect(parseVideoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      kind: "youtube",
      embedSrc: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    })
  })

  it("builds a YouTube embed src from a youtu.be short URL", () => {
    expect(parseVideoEmbed("https://youtu.be/dQw4w9WgXcQ")).toEqual({
      kind: "youtube",
      embedSrc: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    })
  })

  it("builds a YouTube embed src from an already-embed URL", () => {
    expect(parseVideoEmbed("https://www.youtube.com/embed/dQw4w9WgXcQ")).toEqual({
      kind: "youtube",
      embedSrc: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    })
  })

  it("ignores extra query params (tracking, timestamps) around a valid YouTube id", () => {
    expect(parseVideoEmbed("https://youtu.be/dQw4w9WgXcQ?t=10&si=abc")).toEqual({
      kind: "youtube",
      embedSrc: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    })
    expect(parseVideoEmbed("https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0")).toEqual({
      kind: "youtube",
      embedSrc: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    })
  })

  it("builds a Vimeo embed src from a vimeo.com URL", () => {
    expect(parseVideoEmbed("https://vimeo.com/76979871")).toEqual({
      kind: "vimeo",
      embedSrc: "https://player.vimeo.com/video/76979871",
    })
  })

  it("builds a Vimeo embed src from an already-player URL", () => {
    expect(parseVideoEmbed("https://player.vimeo.com/video/76979871")).toEqual({
      kind: "vimeo",
      embedSrc: "https://player.vimeo.com/video/76979871",
    })
  })

  it("treats a direct .mp4/.webm/.ogg URL as a file, not an embed", () => {
    expect(parseVideoEmbed("https://cdn.example.com/clips/intro.mp4")).toEqual({
      kind: "file",
      src: "https://cdn.example.com/clips/intro.mp4",
    })
    expect(parseVideoEmbed("https://cdn.example.com/clips/intro.webm")).toEqual({
      kind: "file",
      src: "https://cdn.example.com/clips/intro.webm",
    })
    expect(parseVideoEmbed("https://cdn.example.com/clips/intro.ogg")).toEqual({
      kind: "file",
      src: "https://cdn.example.com/clips/intro.ogg",
    })
  })

  it("matches a file extension case-insensitively and past a query string", () => {
    expect(parseVideoEmbed("https://cdn.example.com/clips/intro.MP4?v=2")).toEqual({
      kind: "file",
      src: "https://cdn.example.com/clips/intro.MP4?v=2",
    })
  })

  it("rejects a javascript: URL", () => {
    expect(parseVideoEmbed("javascript:alert(1)")).toEqual({ kind: "invalid" })
  })

  it("rejects a data: URL", () => {
    expect(parseVideoEmbed("data:text/html,<script>alert(1)</script>")).toEqual({
      kind: "invalid",
    })
  })

  it("rejects an unknown host impersonating a known embed path", () => {
    expect(parseVideoEmbed("https://evil.example.com/watch?v=dQw4w9WgXcQ")).toEqual({
      kind: "invalid",
    })
    expect(parseVideoEmbed("https://evil.example.com/embed/dQw4w9WgXcQ")).toEqual({
      kind: "invalid",
    })
  })

  it("rejects a host that merely has youtube.com/player.vimeo.com as a subdomain prefix", () => {
    expect(parseVideoEmbed("https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ")).toEqual({
      kind: "invalid",
    })
    expect(parseVideoEmbed("https://player.vimeo.com.evil.com/video/123")).toEqual({
      kind: "invalid",
    })
  })

  it("rejects random, non-URL text", () => {
    expect(parseVideoEmbed("not a url at all")).toEqual({ kind: "invalid" })
  })

  it("rejects an empty or blank string", () => {
    expect(parseVideoEmbed("")).toEqual({ kind: "invalid" })
    expect(parseVideoEmbed("   ")).toEqual({ kind: "invalid" })
  })

  it("rejects a malformed YouTube/Vimeo id (wrong length or non-numeric)", () => {
    expect(parseVideoEmbed("https://youtu.be/short")).toEqual({ kind: "invalid" })
    expect(parseVideoEmbed("https://vimeo.com/not-a-number")).toEqual({ kind: "invalid" })
  })
})
