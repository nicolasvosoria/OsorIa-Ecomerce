'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import useEmblaCarousel from 'embla-carousel-react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { deferStateUpdate } from '@/lib/react/defer-state-update';

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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [zoomEnabled, setZoomEnabled] = useState(true);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: true,
    skipSnaps: false,
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    deferStateUpdate(onSelect);
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Limitar los valores entre 0 y 100
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    
    setMousePosition({ x: clampedX, y: clampedY });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    setZoomEnabled(true); // Reactivar zoom al entrar
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setZoomEnabled(false); // Desactivar zoom al hacer click
    setIsHovering(false);
  }, []);

  if (images.length === 0) {
    return (
      <div className="space-y-4">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Sin imagen
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Slider principal */}
      <div 
        className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted group"
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        ref={imageContainerRef}
      >
        <div className="overflow-hidden h-full" ref={emblaRef}>
          <div className="flex h-full">
            {images.map((img, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-full h-full relative overflow-hidden"
              >
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  className="object-contain"
                  style={{
                    transform: isHovering && zoomEnabled
                      ? `scale(2.5) translate(${(50 - mousePosition.x) / 2.5}%, ${(50 - mousePosition.y) / 2.5}%)`
                      : 'scale(1)',
                    transformOrigin: 'center center',
                    cursor: isHovering && zoomEnabled ? 'zoom-in' : 'default',
                  }}
                  priority={index === 0}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Badge de descuento */}
        {discountPercentage && discountPercentage > 0 && (
          <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold z-10">
            -{discountPercentage}%
          </div>
        )}

        {/* Contador de imágenes */}
        {images.length > 1 && (
          <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium z-10">
            {selectedIndex + 1}/{images.length}
          </div>
        )}

        {/* Botones de navegación */}
        {images.length > 1 && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-10 w-10 rounded-full shadow-lg"
              onClick={scrollPrev}
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-10 w-10 rounded-full shadow-lg"
              onClick={scrollNext}
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* Miniaturas de imágenes */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((img, index) => (
            <button
              key={index}
              type="button"
              onClick={() => scrollTo(index)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg bg-muted transition-all",
                "hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                selectedIndex === index && "ring-2 ring-primary ring-offset-2 opacity-100",
                selectedIndex !== index && "opacity-60"
              )}
              aria-label={`Ver imagen ${index + 1}`}
            >
              <Image
                src={img.url}
                alt={img.alt}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 25vw, 12.5vw"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
