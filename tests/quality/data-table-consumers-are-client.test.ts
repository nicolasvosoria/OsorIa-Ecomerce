import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DATA_TABLE_MODULE = '@/components/admin/data-table';
const DATA_TABLE_PATH = 'components/admin/data-table.tsx';

function findDataTableConsumers(): string[] {
  return ['app', 'components']
    .flatMap(root =>
      readdirSync(root, { recursive: true, encoding: 'utf8' })
        .filter(entry => entry.endsWith('.tsx'))
        .map(entry => `${root}/${entry}`),
    )
    .filter(filePath => filePath !== DATA_TABLE_PATH)
    .filter(filePath => readFileSync(filePath, 'utf8').includes(DATA_TABLE_MODULE));
}

// DataTable takes a function prop (Column.cell), which React cannot serialize
// across the RSC boundary: a Server Component rendering it crashes at runtime,
// never at build time.
describe('data-table consumers are client components', () => {
  it.each(findDataTableConsumers())('%s declares "use client"', filePath => {
    const source = readFileSync(filePath, 'utf8');

    expect(source.trimStart()).toMatch(/^(['"])use client\1/);
  });
});
