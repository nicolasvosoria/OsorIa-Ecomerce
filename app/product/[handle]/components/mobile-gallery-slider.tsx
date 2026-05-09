'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { Product } from '@/lib/shopify/types';
import { Badge } from '@/components/ui/badge';
import { useProductImages, useSelectedVariant } from '@/components/products/variant-selector';
import { deferStateUpdate } from '@/lib/react/defer-state-update';

interface MobileGallerySliderProps {
  product: Product;
}

export function MobileGallerySlider({ product }: MobileGallerySliderProps) {
  const selectedVariant = useSelectedVariant(product);
  const images = useProductImages(product, selectedVariant?.selectedOptions);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);
  const [zoomEnabled, setZoomEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    dragFree: false,
    loop: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onInit = useCallback(() => {
    // Initialize carousel
  }, []);

  const onSelect = useCallback((emblaApi: any) => {
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    onInit();
    deferStateUpdate(() => onSelect(emblaApi));
    emblaApi.on('reInit', onInit);
    emblaApi.on('select', onSelect);
  }, [emblaApi, onInit, onSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
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

  const totalImages = images.length;

  if (totalImages === 0) return null;

  return (
    <div 
      className="relative w-full h-full"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Embla Carousel */}
      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex h-full">
          {images.map((image, index) => (
            <div
              key={`${image.url}-${image.selectedOptions?.map(o => `${o.name},${o.value}`).join('-')}`}
              className="flex-shrink-0 w-full h-full relative overflow-hidden"
            >
              <Image
                style={{
                  aspectRatio: `${image.width} / ${image.height}`,
                  transform: isHovering && zoomEnabled
                    ? `scale(2.5) translate(${(50 - mousePosition.x) / 2.5}%, ${(50 - mousePosition.y) / 2.5}%)`
                    : 'scale(1)',
                  transformOrigin: 'center center',
                  cursor: isHovering && zoomEnabled ? 'zoom-in' : 'default',
                }}
                src={image.url}
                alt={image.altText}
                width={image.width}
                height={image.height}
                className="w-full h-full object-cover"
                quality={100}
                priority={index === 0}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Counter Badge - styled like Latest drop badge */}
      {totalImages > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <Badge variant="outline-secondary">
            {selectedIndex + 1}/{totalImages}
          </Badge>
        </div>
      )}
    </div>
  );
}
