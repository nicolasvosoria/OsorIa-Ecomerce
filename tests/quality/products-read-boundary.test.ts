import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import * as productsRead from '@/lib/supabase/products-read'

// The server-only core carries the admin mutations and the store_id-override bulk
// read; a client bundle importing it would re-open the cross-tenant read footgun.
const SERVER_ONLY_CORE = /["'`]@\/lib\/supabase\/products-api["'`]/
const CLIENT_DIRECTIVE = /^(['"])use client\1/

const CLIENT_SAFE_READS = [
  'getItemById',
  'getItemsByCategory',
  'getProductStock',
  'getVariantStock',
  'searchItems',
]

// A file is a client module when its first real statement is a "use client"
// directive, even behind leading blank lines or comment banners (e.g. an
// eslint-disable header, as on header.tsx and quantity-modal.tsx).
function isClientModule(source: string): boolean {
  let rest = source
  for (;;) {
    const trimmed = rest.replace(/^\s+/, '')
    if (trimmed.startsWith('//')) {
      const newline = trimmed.indexOf('\n')
      rest = newline === -1 ? '' : trimmed.slice(newline + 1)
    } else if (trimmed.startsWith('/*')) {
      const end = trimmed.indexOf('*/')
      rest = end === -1 ? '' : trimmed.slice(end + 2)
    } else {
      return CLIENT_DIRECTIVE.test(trimmed)
    }
  }
}

function clientComponents(): string[] {
  return ['app', 'components', 'lib', 'contexts']
    .flatMap((root) =>
      readdirSync(root, { recursive: true, encoding: 'utf8' })
        .filter((entry) => entry.endsWith('.ts') || entry.endsWith('.tsx'))
        .map((entry) => `${root}/${entry}`),
    )
    .filter((filePath) => isClientModule(readFileSync(filePath, 'utf8')))
}

describe('products-api server-only boundary', () => {
  it.each(clientComponents())(
    '%s does not import the server-only products-api core',
    (filePath) => {
      expect(readFileSync(filePath, 'utf8')).not.toMatch(SERVER_ONLY_CORE)
    },
  )

  it('products-read exposes exactly the five client-safe reads', () => {
    expect(Object.keys(productsRead).sort()).toEqual([...CLIENT_SAFE_READS].sort())
  })
})
