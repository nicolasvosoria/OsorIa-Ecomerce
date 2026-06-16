const DEFAULT_METADATA_BASE_URL = 'http://localhost:3000'
const LOCAL_METADATA_HOSTS = new Set(['localhost', '127.0.0.1'])

type MetadataBaseEnvironment = Record<string, string | undefined>

function metadataBaseProtocolFor(host: string): 'http' | 'https' {
  const hostname = host.split(/[/:?#]/, 1)[0]?.toLowerCase()
  return hostname && LOCAL_METADATA_HOSTS.has(hostname) ? 'http' : 'https'
}

function absoluteMetadataBaseUrl(url: string): string {
  const trimmedUrl = url.trim()

  if (/^https?:\/\//i.test(trimmedUrl)) return trimmedUrl

  return `${metadataBaseProtocolFor(trimmedUrl)}://${trimmedUrl}`
}

export function metadataBaseFromEnvironment(env: MetadataBaseEnvironment = process.env): URL {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim()
  if (siteUrl) return new URL(absoluteMetadataBaseUrl(siteUrl))

  const vercelUrl = env.VERCEL_URL?.trim()
  if (vercelUrl) return new URL(absoluteMetadataBaseUrl(vercelUrl))

  return new URL(DEFAULT_METADATA_BASE_URL)
}
