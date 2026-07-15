"use client"

import Link from 'next/link';
import { useLanguage } from '@/contexts/language-context';

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md mx-auto">
        <div className="mb-8">
          <h1 className="text-8xl font-bold text-primary/20 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            {t.notFound.heading}{' '}
            <Link href="/" className="underline">
              {t.notFound.goHome}
            </Link>
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t.notFound.description}
          </p>
        </div>
      </div>
    </div>
  );
}
