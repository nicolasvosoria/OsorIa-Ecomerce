'use client';

import Link from 'next/link';
import { useQueryState, parseAsString } from 'nuqs';
import { cn } from '@/lib/utils';

export function ComboFilter({ className }: { className?: string }) {
  const [kind] = useQueryState('kind', parseAsString.withDefault('all'));
  const isSelected = kind === 'combo';

  return (
    <div className={cn('px-3 py-4 rounded-lg bg-muted', className)}>
      <h3 className="mb-4 font-semibold">Tipo</h3>
      <div className="flex flex-col gap-1">
        <Link
          href="/shop?kind=combo"
          className={cn(
            'transition-all transform cursor-pointer font-sm md:hover:translate-x-1 md:hover:opacity-80',
            isSelected ? 'font-medium translate-x-1' : '',
          )}
          prefetch
        >
          Solo combos
        </Link>
        <Link
          href="/shop"
          className={cn(
            'transition-all transform cursor-pointer font-sm md:hover:translate-x-1 md:hover:opacity-80',
            !isSelected ? 'font-medium translate-x-1' : 'opacity-50',
          )}
          prefetch
        >
          Todos los productos
        </Link>
      </div>
    </div>
  );
}
