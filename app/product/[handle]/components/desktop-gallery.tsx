'use client';

import { useState, useCallback, useRef } from 'react';
import { useProductImages, useSelectedVariant } from '@/components/products/variant-selector';
import { Product } from '@/lib/shopify/types';
import Image from 'next/image';

function ZoomableImage({ image }: { image: any }) {
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);
  const [zoomEnabled, setZoomEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden group"
      style={{
        aspectRatio: `${image.width} / ${image.height}`,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <Image
        src={image.url}
        alt={image.altText}
        width={image.width}
        height={image.height}
        className="w-full h-full object-cover"
        style={{
          transform: isHovering && zoomEnabled
            ? `scale(2.5) translate(${(50 - mousePosition.x) / 2.5}%, ${(50 - mousePosition.y) / 2.5}%)`
            : 'scale(1)',
          transformOrigin: 'center center',
          cursor: isHovering && zoomEnabled ? 'zoom-in' : 'default',
        }}
        quality={100}
      />
    </div>
  );
}

export const DesktopGallery = ({ product }: { product: Product }) => {
  const selectedVariant = useSelectedVariant(product);
  const images = useProductImages(product, selectedVariant?.selectedOptions);

  return images.map(image => (
    <ZoomableImage
      key={`${image.url}-${image.selectedOptions?.map(o => `${o.name},${o.value}`).join('-')}`}
      image={image}
    />
  ));
};
