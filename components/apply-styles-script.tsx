/**
 * Script que se ejecuta antes de que React se monte
 * Aplica estilos desde localStorage para evitar el "flash" de contenido sin estilo
 */
import Script from "next/script";
import { DEFAULT_RUNTIME_THEME } from "@/lib/theme-font/runtime-contract";

export function ApplyStylesScript() {
  const runtimeDefaultTheme = JSON.stringify(DEFAULT_RUNTIME_THEME);

  return (
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document -- Runtime theme must be applied before hydration to avoid unstyled flashes.
    <Script
      id="apply-styles-script"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  try {
    const root = document.documentElement;

    function normalizeRuntimeStoreId(value) {
      if (!value || typeof value !== 'string') return null;
      const normalized = value.trim();
      if (!normalized) return null;
      if (normalized.toLowerCase() === 'default') return null;
      return normalized;
    }

    function parseJson(value) {
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch (_) {
        return null;
      }
    }

    function normalizeThemePayload(payload) {
      if (!payload || typeof payload !== 'object') return null;
      const colors = payload.colors || payload.theme_config;
      if (!colors || typeof colors !== 'object') return null;
      if (!payload.theme_name || typeof payload.theme_name !== 'string') return null;
      return {
        theme_name: payload.theme_name,
        colors,
      };
    }

    function normalizeFontPayload(payload) {
      if (!payload || typeof payload !== 'object') return null;
      if (!payload.font_name || !payload.font_family) return null;
      const googleFontUrl = payload.google_font_url || payload.font_url || null;
      return {
        font_name: payload.font_name,
        font_family: payload.font_family,
        google_font_url: typeof googleFontUrl === 'string' && googleFontUrl.trim().length > 0 ? googleFontUrl : null,
      };
    }
    
    // Tema por defecto "Claro Original" - se usa solo si no hay tema guardado
    const defaultTheme = ${runtimeDefaultTheme};
    
    // Aplicar tema desde localStorage (que será actualizado por el ThemeProvider con el tema activo de BD)
    // Si no hay tema guardado, usar el por defecto
    const savedTheme = localStorage.getItem('osoria_active_theme');
    let themeToApply = defaultTheme;
    
    if (savedTheme) {
      const parsedTheme = parseJson(savedTheme);
      const normalizedTheme = normalizeThemePayload(parsedTheme);
      if (normalizedTheme) {
        themeToApply = normalizedTheme;
      } else {
        console.warn('[ApplyStyles] Saved theme cache is stale/corrupt, usando tema por defecto');
      }
    }
    
    // Aplicar el tema (guardado o por defecto)
    if (themeToApply.colors) {
      const colors = themeToApply.colors;
      const body = document.body;
      
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
      
      // Aplicar color de fondo al body para temas oscuros
      // Esto evita el "flash" de fondo blanco antes de que React se monte
      body.style.backgroundColor = colors.background;
      
      // Marcar qué tema fue aplicado
      window.__osoria_applied_theme = themeToApply.theme_name;
    }
    
    // Aplicar fuente desde localStorage
    const savedFont = localStorage.getItem('osoria_active_font');
    if (savedFont) {
      const parsedFont = parseJson(savedFont);
      const font = normalizeFontPayload(parsedFont);
      if (font) {
        root.style.setProperty('--font-family-sans', font.font_family);

        // Cargar stylesheet solo para fuentes externas reales
        if (font.google_font_url && font.font_name.toLowerCase() !== 'system') {
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
    }
    
    // Obtener store_id actual de la cookie
    function getStoreIdFromCookie() {
      const cookies = document.cookie.split(';');
      const storeIdCookie = cookies.find(function(c) {
        return c.trim().startsWith('store_id=');
      });
      if (storeIdCookie) {
        return normalizeRuntimeStoreId(storeIdCookie.split('=')[1]);
      }
      // Si no hay cookie, intentar obtener del localStorage
      const savedStoreId = normalizeRuntimeStoreId(localStorage.getItem('osoria_current_store_id'));
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
  );
}
