import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const helperImport = "@/lib/cart/cart-summary";

describe('cart summary helper usage contract', () => {
  it.each([
    'components/cart/modal.tsx',
    'app/checkout/page.tsx',
    'components/layout/header.tsx',
  ])('%s imports the shared cart summary helper', filePath => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain(helperImport);
  });

  it('preserves the current cart when a server quantity update returns null', () => {
    const source = readFileSync('components/cart/cart-context.tsx', 'utf8');
    const updateSource = source.slice(
      source.indexOf('const update ='),
      source.indexOf('const add ='),
    );

    expect(updateSource).toContain('if (fresh) setCart(fresh);');
    expect(updateSource).not.toContain('setCart(fresh ?? createEmptyCart())');
  });
});
