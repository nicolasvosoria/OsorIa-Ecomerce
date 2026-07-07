/**
 * Script que se ejecuta antes de que React se monte
 * Aplica estilos desde localStorage para evitar el "flash" de contenido sin estilo
 */
import Script from "next/script";
import { DEFAULT_RUNTIME_THEME } from "@/lib/theme-font/runtime-contract";
import { THEME_CONTRAST_HELPER_SOURCE } from "@/lib/theme-font/contrast";
import { DEFAULT_DARK_FALLBACK } from "@/lib/theme-font/theme-definition";
import { SECTION_STYLE_APPLIER_SOURCE } from "@/lib/theme/section-style-keys";

export function ApplyStylesScript() {
  const runtimeDefaultTheme = JSON.stringify(DEFAULT_RUNTIME_THEME);
  const runtimeDarkFallbackColors = JSON.stringify(DEFAULT_DARK_FALLBACK);

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
      if (!payload.theme_fingerprint || typeof payload.theme_fingerprint !== 'string') return null;
      const colorsLight = payload.colorsLight && typeof payload.colorsLight === 'object' ? payload.colorsLight : null;
      const colorsDark = payload.colorsDark && typeof payload.colorsDark === 'object' ? payload.colorsDark : null;
      const radius = payload.radius && typeof payload.radius === 'object' ? payload.radius : null;
      const density = payload.density && typeof payload.density === 'object' ? payload.density : null;
      const shadow = payload.shadow && typeof payload.shadow === 'object' ? payload.shadow : null;
      const shape = payload.shape && typeof payload.shape === 'object' ? payload.shape : null;
      const fontPairingId = typeof payload.fontPairingId === 'string' ? payload.fontPairingId : null;
      const sections = payload.sections && typeof payload.sections === 'object' ? payload.sections : null;
      return {
        theme_name: payload.theme_name,
        theme_fingerprint: payload.theme_fingerprint,
        colors,
        colorsLight,
        colorsDark,
        radius,
        density,
        shadow,
        shape,
        fontPairingId,
        sections,
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

    function normalizePairingPayload(payload) {
      if (!payload || typeof payload !== 'object') return null;
      if (!payload.pairing_name || typeof payload.pairing_name !== 'string') return null;
      const heading = normalizeFontPayload(payload.heading);
      const body = normalizeFontPayload(payload.body);
      if (!heading || !body) return null;
      const headingFontAxis = typeof payload.headingFontAxis === 'string' && payload.headingFontAxis.trim().length > 0 ? payload.headingFontAxis.trim() : null;
      const bodyFontAxis = typeof payload.bodyFontAxis === 'string' && payload.bodyFontAxis.trim().length > 0 ? payload.bodyFontAxis.trim() : null;
      return {
        pairing_name: payload.pairing_name,
        heading: heading,
        body: body,
        headingFontAxis: headingFontAxis,
        bodyFontAxis: bodyFontAxis,
      };
    }

    function ensureStylesheetLinkOnce(url) {
      if (!url) return;
      const existingLink = document.querySelector('link[href="' + url + '"]');
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        document.head.appendChild(link);
      }
    }
    
    // Tema por defecto "Claro Original" - se usa solo si no hay tema guardado
    const defaultTheme = ${runtimeDefaultTheme};
    // Paleta oscura curada usada cuando el tema activo no trae un set colorsDark propio.
    const darkFallbackColors = ${runtimeDarkFallbackColors};
${THEME_CONTRAST_HELPER_SOURCE}
${SECTION_STYLE_APPLIER_SOURCE}

    // Resolver la preferencia de modo (claro/oscuro/sistema) antes de aplicar colores,
    // para que el toggle de modo nunca produzca un "flash" del modo contrario.
    const savedMode = localStorage.getItem('osoria_mode');
    const modePreference = savedMode === 'dark' || savedMode === 'light' || savedMode === 'system' ? savedMode : 'light';
    const prefersDarkSystem = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDarkMode = modePreference === 'dark' || (modePreference === 'system' && prefersDarkSystem);
    root.classList.toggle('dark', isDarkMode);

    // El customizer (/admin/theme) carga el storefront real en un iframe con
    // ?themePreview=1: ese frame nunca debe pintar el tema persistido, el
    // padre lo empuja por postMessage (ver contexts/theme-context.tsx). Sin
    // esta guarda habría un flash del tema en BD antes del primer mensaje.
    var isThemePreviewMode = window.location.search.indexOf('themePreview=1') !== -1;

    if (!isThemePreviewMode) {
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

      // Aplicar el tema (guardado o por defecto), en el color set del modo resuelto
      if (themeToApply.colors) {
        const body = document.body;
        const selectedColors = isDarkMode
          ? (themeToApply.colorsDark || darkFallbackColors)
          : (themeToApply.colorsLight || themeToApply.colors);
        const resolvedCssVariables = resolveThemeCssVariables({ colors: selectedColors });
        CRITICAL_THEME_CSS_VARIABLES.forEach(function(variableName) {
          root.style.setProperty(variableName, resolvedCssVariables[variableName]);
        });

        // Aplicar color de fondo al body para temas oscuros
        // Esto evita el "flash" de fondo blanco antes de que React se monte
        body.style.backgroundColor = resolvedCssVariables['--background'];

        // Marcar qué tema fue aplicado
        window.__osoria_applied_theme = { theme_name: themeToApply.theme_name, theme_fingerprint: themeToApply.theme_fingerprint || null };
      }

      // Aplicar tokens de forma/sombra (opt-in, independientes del modo). Los
      // fallbacks reproducen el look actual byte a byte: '--radius' y
      // '--button-radius' ya coinciden con app/globals.css, y '--card-radius'/
      // '--shadow-card' coinciden con el radio y la sombra reales en reposo de
      // VisualProductCard (ver DEFAULT_THEME_TOKENS).
      var themeRadius = themeToApply.radius || {};
      var themeShape = themeToApply.shape || {};
      var themeShadow = themeToApply.shadow || {};
      root.style.setProperty('--radius', themeRadius.base || '0.5rem');
      root.style.setProperty('--button-radius', themeShape.button || 'var(--radius)');
      root.style.setProperty('--card-radius', themeShape.card || '1.5rem');
      root.style.setProperty('--shadow-card', themeShadow.card || 'none');
      root.style.setProperty('--shadow-elevated', themeShadow.elevated || 'none');

      // Escala de densidad (independiente del modo). Alimenta el ancla global
      // '--spacing' en app/globals.css; escala 1 no tiene efecto sobre el
      // valor por defecto de Tailwind.
      var themeDensity = themeToApply.density || {};
      root.style.setProperty('--density-scale', String(themeDensity.scale != null ? themeDensity.scale : 1));

      // Colores de superficie por sección (independientes del modo por ahora).
      // Cada 'theme.sections.<seccion>' se vuelve '--sec-<seccion>-<clave-kebab>',
      // ej. 'cardBg' en 'featured' escribe '--sec-featured-card-bg'. Runs the
      // SAME createSectionStyleApplier logic (and the same
      // PRODUCTS_RADIUS_LENGTH values) as applyRuntimeTheme in
      // lib/theme-font/bootstrap.ts, via sectionStyleApplier embedded above
      // from lib/theme/section-style-keys.ts's SECTION_STYLE_APPLIER_SOURCE
      // (single source of truth -- see that file for the cornerRadius mapping).
      sectionStyleApplier.apply(themeToApply.sections, function(name, value) {
        root.style.setProperty(name, value);
      });
    }

    // Aplicar combinación de fuentes (heading + body) desde localStorage
    var pairingApplied = false;
    const savedPairing = localStorage.getItem('osoria_active_pairing');
    if (savedPairing) {
      const parsedPairing = parseJson(savedPairing);
      const pairing = normalizePairingPayload(parsedPairing);
      if (pairing) {
        root.style.setProperty('--font-family-heading', pairing.heading.font_family);
        root.style.setProperty('--font-family-sans', pairing.body.font_family);

        // Un solo stylesheet combinado si tenemos ambos axis; si no, cada google_font_url por separado
        if (pairing.headingFontAxis && pairing.bodyFontAxis) {
          const combinedUrl = 'https://fonts.googleapis.com/css2?family=' + pairing.headingFontAxis + '&family=' + pairing.bodyFontAxis + '&display=swap';
          ensureStylesheetLinkOnce(combinedUrl);
        } else {
          if (pairing.heading.google_font_url && pairing.heading.font_name.toLowerCase() !== 'system') {
            ensureStylesheetLinkOnce(pairing.heading.google_font_url);
          }
          if (pairing.body.google_font_url && pairing.body.font_name.toLowerCase() !== 'system') {
            ensureStylesheetLinkOnce(pairing.body.google_font_url);
          }
        }

        // Marcar qué combinación fue aplicada
        window.__osoria_applied_pairing = pairing.pairing_name;
        pairingApplied = true;
      }
    }

    // Aplicar fuente suelta (legacy) desde localStorage — solo como fallback de migración
    // cuando todavía no hay una combinación (pairing) activa cacheada.
    if (!pairingApplied) {
      const savedFont = localStorage.getItem('osoria_active_font');
      if (savedFont) {
        const parsedFont = parseJson(savedFont);
        const font = normalizeFontPayload(parsedFont);
        if (font) {
          root.style.setProperty('--font-family-sans', font.font_family);

          // Cargar stylesheet solo para fuentes externas reales
          if (font.google_font_url && font.font_name.toLowerCase() !== 'system') {
            ensureStylesheetLinkOnce(font.google_font_url);
          }

          // Marcar qué fuente fue aplicada
          window.__osoria_applied_font = font.font_name;
        }
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
