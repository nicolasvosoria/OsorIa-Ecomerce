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
    
    // Obtener store_id actual de la cookie
    function getStoreIdFromCookie() {
      const cookies = document.cookie.split(';');
      const storeIdCookie = cookies.find(function(c) {
        return c.trim().startsWith('store_id=');
      });
      if (storeIdCookie) {
        return storeIdCookie.split('=')[1];
      }
      // Si no hay cookie, intentar obtener del localStorage
      const savedStoreId = localStorage.getItem('osoria_current_store_id');
      if (savedStoreId) {
        return savedStoreId;
      }
      // Fallback: intentar detectar del hostname
      const hostname = window.location.hostname;
      if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        const parts = hostname.split('.');
        if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127') {
          // Es un subdominio localhost (ej: reposteria.localhost)
          // No podemos obtener el UUID real aquí, pero podemos usar el subdominio como referencia
          return null; // Retornar null para que se cargue desde Supabase después
        }
      }
      return null;
    }
    
    // Aplicar favicon basado en el subdominio del hostname (antes de que React se monte)
    function getSubdomainFromHostname() {
      const hostname = window.location.hostname;
      
      // En desarrollo local, detectar subdominios como reposteria.localhost
      if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        const parts = hostname.split('.');
        if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127') {
          return parts[0]; // Retornar el subdominio (ej: 'reposteria')
        }
        return 'default';
      }

      // En producción, extraer subdominio
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        const subdomain = parts[0];
        if (subdomain === 'www') {
          return parts.length > 2 ? parts[1] : 'default';
        }
        return subdomain;
      }
      
      return 'default';
    }
    
    // Aplicar favicon inmediatamente
    (function() {
      const subdomain = getSubdomainFromHostname();
      const faviconPath = subdomain === 'default' 
        ? '/favicon.ico' 
        : '/favicon-' + subdomain + '.ico';
      
      // Buscar o crear el link del favicon
      let faviconLink = document.querySelector("link[rel='icon']");
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.setAttribute('rel', 'icon');
        faviconLink.setAttribute('type', 'image/x-icon');
        document.head.appendChild(faviconLink);
      }
      
      // Verificar si el favicon existe antes de cambiarlo
      const img = new Image();
      img.onload = function() {
        faviconLink.setAttribute('href', faviconPath);
        console.log('[ApplyStyles] Favicon aplicado desde script:', faviconPath);
      };
      img.onerror = function() {
        // El favicon específico no existe, usar el por defecto
        if (subdomain !== 'default') {
          faviconLink.setAttribute('href', '/favicon.ico');
          console.log('[ApplyStyles] Favicon específico no encontrado, usando por defecto');
        }
      };
      img.src = faviconPath;
    })();
    
    // Aplicar título inmediatamente basado en el subdominio
    (function() {
      const subdomain = getSubdomainFromHostname();
      
      // Mapeo de títulos personalizados por subdominio
      const SUBDOMAIN_TITLES = {
        reposteria: 'Tienda de Postres',
        // Agrega más subdominios aquí si es necesario
      };
      
      // Obtener el título correcto
      let title = SUBDOMAIN_TITLES[subdomain] || 'Ecommerce';
      
      // Aplicar el título inmediatamente
      if (document.title !== title) {
        document.title = title;
        console.log('[ApplyStyles] Título aplicado desde script:', title);
      }
      
      // Usar un intervalo para mantener el título si algo lo cambia
      const titleCheckInterval = setInterval(function() {
        if (document.title !== title) {
          document.title = title;
        }
      }, 50); // Verificar cada 50ms
      
      // Limpiar el intervalo después de 5 segundos (para dar tiempo a que React se monte)
      setTimeout(function() {
        clearInterval(titleCheckInterval);
      }, 5000);
    })();
    
    // Aplicar estilos de componentes desde localStorage (filtrado por store_id)
    const currentStoreId = getStoreIdFromCookie();
    if (currentStoreId) {
      const storageKey = 'osoria_component_styles_' + currentStoreId;
      const savedStyles = localStorage.getItem(storageKey);
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
    } else {
      // Si no hay store_id, limpiar estilos antiguos del localStorage (migración)
      // Esto ayuda a evitar que se carguen estilos de otras tiendas
      try {
        const oldStyles = localStorage.getItem('osoria_component_styles');
        if (oldStyles) {
          // Limpiar el formato antiguo sin store_id
          localStorage.removeItem('osoria_component_styles');
        }
      } catch (e) {
        // Ignorar errores de limpieza
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

