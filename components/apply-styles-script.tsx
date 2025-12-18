/**
 * Script que se ejecuta antes de que React se monte
 * Aplica estilos desde localStorage para evitar el "flash" de contenido sin estilo
 */
import Script from "next/script"

export function ApplyStylesScript() {
  return (
    <Script
      id="apply-styles-script"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  try {
    const root = document.documentElement;
    
    // Aplicar tema desde localStorage
    const savedTheme = localStorage.getItem('osoria_active_theme');
    if (savedTheme) {
      try {
        const theme = JSON.parse(savedTheme);
        if (theme.colors) {
          const colors = theme.colors;
          root.style.setProperty('--primary', colors.primary);
          root.style.setProperty('--secondary', colors.secondary);
          root.style.setProperty('--accent', colors.accent);
          root.style.setProperty('--background', colors.background);
          root.style.setProperty('--foreground', colors.foreground);
          root.style.setProperty('--card', colors.card);
          root.style.setProperty('--card-foreground', colors.cardForeground);
          root.style.setProperty('--border', colors.border);
          root.style.setProperty('--muted', colors.muted);
          root.style.setProperty('--muted-foreground', colors.mutedForeground);
          root.style.setProperty('--primary-foreground', colors.foreground);
          root.style.setProperty('--secondary-foreground', colors.foreground);
          root.style.setProperty('--accent-foreground', colors.foreground);
        }
      } catch (e) {
        console.warn('[ApplyStyles] Error parsing saved theme:', e);
      }
    }
    
    // Aplicar fuente desde localStorage
    const savedFont = localStorage.getItem('osoria_active_font');
    if (savedFont) {
      try {
        const font = JSON.parse(savedFont);
        if (font.font_family) {
          root.style.setProperty('--font-family-sans', font.font_family);
          
          // Cargar Google Font si existe
          if (font.google_font_url) {
            const existingLink = document.querySelector('link[href="' + font.google_font_url + '"]');
            if (!existingLink) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = font.google_font_url;
              document.head.appendChild(link);
            }
          }
        }
      } catch (e) {
        console.warn('[ApplyStyles] Error parsing saved font:', e);
      }
    }
    
    // Aplicar estilos de componentes desde localStorage
    const savedStyles = localStorage.getItem('osoria_component_styles');
    if (savedStyles) {
      try {
        const styles = JSON.parse(savedStyles);
        if (typeof styles === 'object' && styles !== null) {
          Object.keys(styles).forEach(function(componentName) {
            const componentStyles = styles[componentName];
            if (typeof componentStyles === 'object' && componentStyles !== null) {
              Object.keys(componentStyles).forEach(function(key) {
                const cssVar = '--' + componentName + '-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
                root.style.setProperty(cssVar, componentStyles[key]);
              });
            }
          });
        }
      } catch (e) {
        console.warn('[ApplyStyles] Error parsing saved component styles:', e);
      }
    }
  } catch (e) {
    console.warn('[ApplyStyles] Error applying styles:', e);
  }
})();
        `,
      }}
    />
  )
}

