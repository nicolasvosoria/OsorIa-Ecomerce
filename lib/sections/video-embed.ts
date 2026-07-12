// Turns a user-typed video URL into a safe render instruction for the
// `video` section. NEVER pass the raw user URL to an `<iframe src>` — only
// the `embedSrc` this module builds from a validated ID, against a fixed
// template, for a small whitelist of known embed hosts (YouTube, Vimeo).
// Any URL that doesn't match one of those hosts, or a direct media file
// extension, resolves to `"invalid"` — including `javascript:`/`data:`
// URLs, unknown hosts, and malformed input.

export type VideoEmbed =
  | { kind: "youtube" | "vimeo"; embedSrc: string }
  | { kind: "file"; src: string }
  | { kind: "invalid" }

const YOUTUBE_EMBED_BASE = "https://www.youtube.com/embed"
const VIMEO_EMBED_BASE = "https://player.vimeo.com/video"

const YOUTUBE_VIDEO_ID = /^[\w-]{11}$/
const YOUTUBE_EMBED_PATH = /^\/embed\/([\w-]{11})$/
const VIMEO_ID_PATH = /^\/(\d+)$/
const VIMEO_PLAYER_PATH = /^\/video\/(\d+)$/
const FILE_EXTENSION = /\.(mp4|webm|ogg)(?:[?#].*)?$/i

function stripWww(hostname: string): string {
  return hostname.replace(/^www\./, "")
}

function extractYoutubeId(url: URL): string | null {
  const host = stripWww(url.hostname)
  if (host === "youtu.be") {
    const id = url.pathname.slice(1)
    return YOUTUBE_VIDEO_ID.test(id) ? id : null
  }
  if (host === "youtube.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v")
      return id && YOUTUBE_VIDEO_ID.test(id) ? id : null
    }
    return url.pathname.match(YOUTUBE_EMBED_PATH)?.[1] ?? null
  }
  return null
}

function extractVimeoId(url: URL): string | null {
  const host = stripWww(url.hostname)
  if (host === "vimeo.com") return url.pathname.match(VIMEO_ID_PATH)?.[1] ?? null
  if (host === "player.vimeo.com") return url.pathname.match(VIMEO_PLAYER_PATH)?.[1] ?? null
  return null
}

function parseHttpUrl(rawUrl: string): URL | null {
  try {
    const url = new URL(rawUrl)
    return url.protocol === "https:" || url.protocol === "http:" ? url : null
  } catch {
    return null
  }
}

export function parseVideoEmbed(rawUrl: string): VideoEmbed {
  const url = parseHttpUrl(rawUrl.trim())
  if (!url) return { kind: "invalid" }

  const youtubeId = extractYoutubeId(url)
  if (youtubeId) return { kind: "youtube", embedSrc: `${YOUTUBE_EMBED_BASE}/${youtubeId}` }

  const vimeoId = extractVimeoId(url)
  if (vimeoId) return { kind: "vimeo", embedSrc: `${VIMEO_EMBED_BASE}/${vimeoId}` }

  if (FILE_EXTENSION.test(url.pathname)) return { kind: "file", src: url.toString() }

  return { kind: "invalid" }
}
