import { describe, expect, it } from 'vitest'

import { metadataBaseFromEnvironment } from '@/lib/metadata/metadata-base'

describe('metadataBaseFromEnvironment', () => {
  it('accepts NEXT_PUBLIC_SITE_URL with an explicit protocol', () => {
    expect(metadataBaseFromEnvironment({ NEXT_PUBLIC_SITE_URL: 'https://osoria.example' }).href).toBe(
      'https://osoria.example/',
    )
  })

  it('normalizes a bare production host from NEXT_PUBLIC_SITE_URL', () => {
    expect(metadataBaseFromEnvironment({ NEXT_PUBLIC_SITE_URL: 'osoria.example' }).href).toBe(
      'https://osoria.example/',
    )
  })

  it('normalizes a bare localhost host without forcing https', () => {
    expect(metadataBaseFromEnvironment({ NEXT_PUBLIC_SITE_URL: 'localhost:3000' }).href).toBe(
      'http://localhost:3000/',
    )
  })

  it('uses VERCEL_URL when the public site URL is absent', () => {
    expect(metadataBaseFromEnvironment({ VERCEL_URL: 'preview.vercel.app' }).href).toBe(
      'https://preview.vercel.app/',
    )
  })

  it('falls back to local development when no deployment URL exists', () => {
    expect(metadataBaseFromEnvironment({}).href).toBe('http://localhost:3000/')
  })
})
