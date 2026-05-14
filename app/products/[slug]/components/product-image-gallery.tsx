'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ProductImage {
  url: string;
  alt: string;
}

interface ProductImageGalleryProps {
  images: ProductImage[];
  discountPercentage?: number;
}

export function ProductImageGallery({ images, discountPercentage }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const selectedImage = images[selectedIndex];
  const hasMultipleImages = images.length > 1;

  const selectImage = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const showPreviousImage = useCallback(() => {
    setSelectedIndex((currentIndex) => (currentIndex === 0 ? images.length - 1 : currentIndex - 1));
  }, [images.length]);

  const showNextImage = useCallback(() => {
    setSelectedIndex((currentIndex) => (currentIndex === images.length - 1 ? 0 : currentIndex + 1));
  }, [images.length]);

  const openZoom = useCallback(() => {
    setIsZoomOpen(true);
  }, []);

  const closeZoom = useCallback(() => {
    setIsZoomOpen(false);
  }, []);

  useEffect(() => {
    if (!isZoomOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeZoom();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeZoom, isZoomOpen]);

  if (images.length === 0) {
    return (
      <section aria-label="Galería de imágenes del producto" className="space-y-4">
        <div
          aria-label="Sin imagen del producto"
          role="img"
          className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted"
        >
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Sin imagen
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Galería de imágenes del producto" className="w-full max-w-full overflow-hidden">
      <div className="flex w-full max-w-full flex-col gap-3 md:flex-row md:items-start">
        {hasMultipleImages && (
          <div
            aria-label="Miniaturas de producto"
            aria-orientation="vertical"
            className="order-2 flex max-w-full gap-2 overflow-x-auto pb-1 md:order-1 md:w-20 md:flex-col md:overflow-visible md:pb-0"
            role="listbox"
          >
            {images.map((img, index) => (
              <button
                key={`${img.url}-${index}`}
                type="button"
                role="option"
                aria-label={`Imagen ${index + 1} de ${images.length}: ${img.alt}`}
                aria-selected={selectedIndex === index}
                onClick={() => selectImage(index)}
                className={cn(
                  'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted transition-opacity md:h-20 md:w-20',
                  'hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  selectedIndex === index ? 'opacity-100 ring-2 ring-primary ring-offset-2' : 'opacity-60',
                )}
              >
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 64px, 80px"
                />
              </button>
            ))}
          </div>
        )}

        <div className="order-1 min-w-0 flex-1 md:order-2">
          <div
            role="group"
            aria-label="Imagen principal seleccionada"
            className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted group"
          >
            <button
              type="button"
              aria-label={`Ampliar imagen ${selectedImage.alt}`}
              onClick={openZoom}
              className="relative block h-full w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Image
                src={selectedImage.url}
                alt={selectedImage.alt}
                fill
                className="object-contain"
                priority={selectedIndex === 0}
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </button>

            {discountPercentage && discountPercentage > 0 && (
              <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold z-10">
                -{discountPercentage}%
              </div>
            )}

            {hasMultipleImages && (
              <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium z-10">
                {selectedIndex + 1}/{images.length}
              </div>
            )}

            {hasMultipleImages && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 opacity-100 transition-opacity z-10 h-10 w-10 rounded-full shadow-lg md:opacity-0 md:group-hover:opacity-100"
                  onClick={showPreviousImage}
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-100 transition-opacity z-10 h-10 w-10 rounded-full shadow-lg md:opacity-0 md:group-hover:opacity-100"
                  onClick={showNextImage}
                  aria-label="Imagen siguiente"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {isZoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Imagen ampliada"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closeZoom}
        >
          <div className="relative h-full max-h-[90vh] w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <Image
              src={selectedImage.url}
              alt={selectedImage.alt}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-3 top-3 rounded-full"
              onClick={closeZoom}
              onTouchEnd={closeZoom}
              aria-label="Cerrar zoom"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
