'use client';

import { useEffect } from 'react';
import { useComponentStyle } from '@/contexts/styles-context';

/**
 * Componente que aplica el fondo del sitio configurado desde el panel admin
 * Si no hay configuración personalizada, usa el color de fondo del tema activo
 * Se aplica al body para que cubra todo el sitio
 * 
 * Nota: No usa useTheme para evitar problemas de orden de providers.
 * En su lugar, lee las variables CSS que ya están aplicadas por ThemeProvider.
 */
export function SiteBackground() {
  const { styles: backgroundStyles } = useComponentStyle('site_background', {
    type: 'color',
    backgroundColor: '', // Vacío para usar el tema por defecto
    backgroundImage: '',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const body = document.body;
    const root = document.documentElement;
    
    const applyBackground = () => {
      // Obtener color de fondo del tema activo (desde CSS variable)
      // Esto funciona porque ApplyStylesScript y ThemeProvider ya aplicaron las variables
      const themeBackgroundColor = getComputedStyle(root).getPropertyValue('--background').trim() || '#ffffff';
      
      // Determinar si hay configuración personalizada de fondo
      const hasCustomBackground = backgroundStyles.backgroundColor && 
                                  backgroundStyles.backgroundColor !== '' &&
                                  backgroundStyles.backgroundColor !== '#ffffff';
      const hasCustomImage = backgroundStyles.type === 'image' && backgroundStyles.backgroundImage;

      if (hasCustomImage) {
        // Aplicar imagen de fondo personalizada
        body.style.backgroundColor = backgroundStyles.backgroundColor || themeBackgroundColor || 'transparent';
        body.style.backgroundImage = `url(${backgroundStyles.backgroundImage})`;
        body.style.backgroundPosition = backgroundStyles.backgroundPosition || 'center';
        body.style.backgroundRepeat = backgroundStyles.backgroundRepeat || 'no-repeat';
        body.style.backgroundSize = backgroundStyles.backgroundSize || 'cover';
        body.style.backgroundAttachment = 'fixed';
      } else if (hasCustomBackground) {
        // Aplicar color de fondo personalizado desde admin
        body.style.backgroundColor = backgroundStyles.backgroundColor;
        body.style.backgroundImage = 'none';
        body.style.backgroundPosition = '';
        body.style.backgroundRepeat = '';
        body.style.backgroundSize = '';
        body.style.backgroundAttachment = '';
      } else {
        // Usar color de fondo del tema activo (desde CSS variable)
        // Esto permite que los temas oscuros funcionen correctamente
        body.style.backgroundColor = themeBackgroundColor;
        body.style.backgroundImage = 'none';
        body.style.backgroundPosition = '';
        body.style.backgroundRepeat = '';
        body.style.backgroundSize = '';
        body.style.backgroundAttachment = '';
      }
    };

    // Aplicar inmediatamente
    applyBackground();

    // Observar cambios en las variables CSS para actualizar cuando cambie el tema
    // Usar MutationObserver para detectar cambios en los estilos del root
    const observer = new MutationObserver(() => {
      applyBackground();
    });

    // Observar cambios en los atributos de estilo del root
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['style'],
    });

    // También verificar periódicamente (por si el tema cambia de otra forma)
    // Usar un intervalo más largo para no afectar el rendimiento
    const interval = setInterval(() => {
      applyBackground();
    }, 500); // Verificar cada 500ms

    // Cleanup
    return () => {
      observer.disconnect();
      clearInterval(interval);
      // No limpiar completamente, dejar que el CSS tome control
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














