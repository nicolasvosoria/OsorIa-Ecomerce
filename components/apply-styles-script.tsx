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
    
    // Tema por defecto "Claro Original" - se usa solo si no hay tema guardado
    const defaultTheme = {
      theme_name: 'Claro Original',
      colors: {
        primary: '#005aa1',
        secondary: '#c4faff',
        accent: '#005aa1',
        background: '#ffffff',
        foreground: '#1a1a1a',
        card: '#ffffff',
        cardForeground: '#1a1a1a',
        border: '#e5e5e5',
        muted: '#f5f5f5',
        mutedForeground: '#737373'
      }
    };
    
    // Aplicar tema desde localStorage (que será actualizado por el ThemeProvider con el tema activo de BD)
    // Si no hay tema guardado, usar el por defecto
    const savedTheme = localStorage.getItem('osoria_active_theme');
    let themeToApply = defaultTheme;
    
    if (savedTheme) {
      try {
        const parsedTheme = JSON.parse(savedTheme);
        if (parsedTheme.colors && parsedTheme.theme_name) {
          themeToApply = parsedTheme;
        }
      } catch (e) {
        console.warn('[ApplyStyles] Error parsing saved theme, usando tema por defecto:', e);
      }
    }
    
    // Aplicar el tema (guardado o por defecto)
    if (themeToApply.colors) {
      const colors = themeToApply.colors;
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
      
      // Marcar qué tema fue aplicado
      window.__osoria_applied_theme = themeToApply.theme_name;
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
          
          // Marcar qué fuente fue aplicada
          window.__osoria_applied_font = font.font_name;
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
              // Aplicar fondo del sitio de manera especial
              if (componentName === 'site_background') {
                const body = document.body;
                const type = componentStyles.type || 'color';
                
                if (type === 'color') {
                  // Aplicar color de fondo
                  body.style.backgroundColor = componentStyles.backgroundColor || '#ffffff';
                  body.style.backgroundImage = 'none';
                } else if (type === 'image' && componentStyles.backgroundImage) {
                  // Aplicar imagen de fondo
                  body.style.backgroundColor = componentStyles.backgroundColor || 'transparent';
                  body.style.backgroundImage = 'url(' + componentStyles.backgroundImage + ')';
                  body.style.backgroundPosition = componentStyles.backgroundPosition || 'center';
                  body.style.backgroundRepeat = componentStyles.backgroundRepeat || 'no-repeat';
                  body.style.backgroundSize = componentStyles.backgroundSize || 'cover';
                  body.style.backgroundAttachment = 'fixed'; // Para que sea responsive y cubra toda la pantalla
                }
              } else {
                // Aplicar estilos normales de componentes
                Object.keys(componentStyles).forEach(function(key) {
                  const cssVar = '--' + componentName + '-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
                  root.style.setProperty(cssVar, componentStyles[key]);
                });
              }
            }
          });
        }
      } catch (e) {
        console.warn('[ApplyStyles] Error parsing saved component styles:', e);
      }
    }
    
    // Marcar que los estilos ya fueron aplicados desde el script
    // Esto evita que los providers los sobrescriban durante la carga
    window.__osoria_styles_applied = true;
    
    // Marcar que el script se ejecutó completamente
    window.__osoria_script_executed = true;
  } catch (e) {
    console.warn('[ApplyStyles] Error applying styles:', e);
    // Marcar como ejecutado incluso si hay error, para no bloquear la carga
    window.__osoria_script_executed = true;
    window.__osoria_styles_applied = true;
  }
})();
        `,
      }}
    />
  )
}

