'use client';

import { useEffect } from 'react';
import { useComponentStyle } from '@/contexts/styles-context';

/**
 * Componente que aplica el fondo del sitio configurado desde el panel admin
 * Se aplica al body para que cubra todo el sitio
 */
export function SiteBackground() {
  const { styles: backgroundStyles } = useComponentStyle('site_background', {
    type: 'color',
    backgroundColor: '#ffffff',
    backgroundImage: '',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const body = document.body;
    const type = backgroundStyles.type || 'color';

    if (type === 'color') {
      // Aplicar color de fondo
      body.style.backgroundColor = backgroundStyles.backgroundColor || '#ffffff';
      body.style.backgroundImage = 'none';
      body.style.backgroundPosition = '';
      body.style.backgroundRepeat = '';
      body.style.backgroundSize = '';
      body.style.backgroundAttachment = '';
    } else if (type === 'image' && backgroundStyles.backgroundImage) {
      // Aplicar imagen de fondo
      body.style.backgroundColor = backgroundStyles.backgroundColor || 'transparent';
      body.style.backgroundImage = `url(${backgroundStyles.backgroundImage})`;
      body.style.backgroundPosition = backgroundStyles.backgroundPosition || 'center';
      body.style.backgroundRepeat = backgroundStyles.backgroundRepeat || 'no-repeat';
      body.style.backgroundSize = backgroundStyles.backgroundSize || 'cover';
      body.style.backgroundAttachment = 'fixed'; // Fijo para mejor efecto visual
    } else {
      // Resetear si no hay configuración válida
      body.style.backgroundColor = '';
      body.style.backgroundImage = '';
      body.style.backgroundPosition = '';
      body.style.backgroundRepeat = '';
      body.style.backgroundSize = '';
      body.style.backgroundAttachment = '';
    }

    // Cleanup: restaurar estilos por defecto si el componente se desmonta
    return () => {
      body.style.backgroundColor = '';
      body.style.backgroundImage = '';
      body.style.backgroundPosition = '';
      body.style.backgroundRepeat = '';
      body.style.backgroundSize = '';
      body.style.backgroundAttachment = '';
    };
  }, [backgroundStyles]);

  // Este componente no renderiza nada, solo aplica estilos
  return null;
}


