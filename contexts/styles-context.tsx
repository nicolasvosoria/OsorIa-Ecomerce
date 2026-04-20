"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import {
  getComponentStyles,
  subscribeToStyleChanges,
} from "@/lib/supabase/styles-api";
import {
  getRuntimeStoreIdSync,
  resolveScopedStorageKey,
} from "@/lib/utils/store";

interface StylesContextType {
  styles: Map<string, Record<string, any>>;
  loading: boolean;
  error: string | null;
  refreshStyles: () => Promise<void>;
}

const StylesContext = createContext<StylesContextType | undefined>(undefined);

export function StylesProvider({ children }: { children: ReactNode }) {
  const [styles, setStyles] = useState<Map<string, Record<string, any>>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para obtener storeId actual (de forma síncrona desde cookies/localStorage)
  // No usamos el contexto directamente para evitar dependencias circulares
  const getCurrentStoreId = (): string | null => {
    if (typeof window === "undefined") return null;
    // Retornar solo UUID real para cache keys críticas
    return getRuntimeStoreIdSync();
  };

  const refreshStyles = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener store_id actual
      const currentStoreId = getCurrentStoreId();
      if (!currentStoreId) {
        console.warn("[v0] No store_id available, skipping style load");
        setLoading(false);
        return;
      }

      // Primero intentar cargar desde localStorage para mostrar datos inmediatamente
      try {
        const storageKey = resolveScopedStorageKey(
          "osoria_component_styles",
          currentStoreId,
        );
        if (!storageKey) {
          setLoading(false);
          return;
        }
        const cachedStyles = localStorage.getItem(storageKey);
        if (cachedStyles) {
          const cachedData = JSON.parse(cachedStyles) as Record<
            string,
            Record<string, any>
          >;
          const cachedMap = new Map<string, Record<string, any>>(
            Object.entries(cachedData),
          );
          setStyles(cachedMap);
          console.log(
            `[v0] Loaded cached styles from localStorage for store ${currentStoreId}:`,
            cachedMap.size,
            "components",
          );
        }
      } catch (e) {
        console.warn("[v0] Error loading cached styles from localStorage:", e);
      }

      // Luego cargar desde Supabase para obtener la versión más actualizada
      const data = await getComponentStyles();
      const stylesMap = new Map<string, Record<string, any>>(
        data.map(
          (style: {
            component_name: string;
            variables: Record<string, any>;
          }) => [style.component_name, style.variables],
        ),
      );
      setStyles(stylesMap);

      // Guardar en localStorage con store_id para evitar conflictos entre tiendas
      try {
        const stylesObject = Object.fromEntries(stylesMap);
        const storageKey = resolveScopedStorageKey(
          "osoria_component_styles",
          currentStoreId,
        );
        if (!storageKey) {
          return;
        }
        localStorage.setItem(storageKey, JSON.stringify(stylesObject));

        // También guardar el store_id actual para referencia
        localStorage.setItem("osoria_current_store_id", currentStoreId);

        // Limpiar estilos de otras tiendas si existen (opcional, para ahorrar espacio)
        // Esto se puede hacer periódicamente, no en cada carga
      } catch (e) {
        console.warn("[v0] Error saving component styles to localStorage:", e);
      }

      // Logs reducidos para evitar spam en consola
      if (stylesMap.size > 0) {
        console.log(
          `[v0] Loaded styles from Supabase for store ${currentStoreId}:`,
          stylesMap.size,
          "components",
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.log("[v0] Could not load styles from Supabase:", errorMessage);
      setError(errorMessage);
      // Don't throw, just continue with empty styles
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Solo cargar en el cliente, no durante SSR/prerendering
    if (typeof window !== "undefined") {
      // Función para intentar cargar estilos
      const attemptLoadStyles = () => {
        const currentStoreId = getCurrentStoreId();
        if (currentStoreId) {
          console.log(
            `[v0] StoreId disponible: ${currentStoreId}, cargando estilos...`,
          );
          refreshStyles();
          return true;
        }
        return false;
      };

      // Intentar cargar inmediatamente
      if (!attemptLoadStyles()) {
        // Si no hay storeId, esperar y reintentar varias veces
        let attempts = 0;
        const maxAttempts = 10;
        const interval = setInterval(() => {
          attempts++;
          if (attemptLoadStyles() || attempts >= maxAttempts) {
            clearInterval(interval);
            if (attempts >= maxAttempts) {
              console.warn(
                "[v0] No se pudo obtener storeId después de varios intentos",
              );
              setLoading(false);
            }
          }
        }, 200); // Reintentar cada 200ms

        return () => clearInterval(interval);
      }
    } else {
      // Durante SSR, usar valores por defecto
      setLoading(false);
    }
  }, []); // Dependencias vacías porque getCurrentStoreId se llama dentro

  // También escuchar cambios en el storeId (por si cambia el subdominio)
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Escuchar cambios en localStorage para storeId
      const handleStorageChange = (e: StorageEvent) => {
        if (
          e.key === "osoria_current_store_id" ||
          e.key?.startsWith("osoria_component_styles_")
        ) {
          console.log(
            "[v0] Cambio detectado en localStorage, recargando estilos...",
          );
          refreshStyles();
        }
      };

      window.addEventListener("storage", handleStorageChange);

      // También verificar periódicamente si el storeId cambió
      let lastStoreId = getCurrentStoreId();
      const checkInterval = setInterval(() => {
        const currentStoreId = getCurrentStoreId();
        if (currentStoreId && currentStoreId !== lastStoreId) {
          console.log(
            `[v0] StoreId cambió de ${lastStoreId} a ${currentStoreId}, recargando estilos...`,
          );
          lastStoreId = currentStoreId;
          refreshStyles();
        }
      }, 1000); // Verificar cada segundo

      return () => {
        window.removeEventListener("storage", handleStorageChange);
        clearInterval(checkInterval);
      };
    }
  }, []);

  return (
    <StylesContext.Provider value={{ styles, loading, error, refreshStyles }}>
      {children}
    </StylesContext.Provider>
  );
}

export function useStyles() {
  const context = useContext(StylesContext);
  if (context === undefined) {
    // Return default values instead of throwing
    console.warn(
      "[v0] useStyles called outside of StylesProvider, returning defaults",
    );
    return {
      styles: new Map(),
      loading: false,
      error: "Not in StylesProvider",
      refreshStyles: async () => {},
    };
  }
  return context;
}

export function useComponentStyle(
  componentName: string,
  defaultStyles: Record<string, any> = {},
) {
  const { styles, loading } = useStyles();

  // Memoizar defaultStyles para evitar re-renders infinitos
  const memoizedDefaults = useMemo(
    () => defaultStyles,
    [JSON.stringify(defaultStyles)],
  );

  // Inicializar con datos guardados si existen, o con defaults
  const [componentStyles, setComponentStyles] = useState<Record<string, any>>(
    () => {
      const savedStyles = styles.get(componentName);
      if (savedStyles && Object.keys(savedStyles).length > 0) {
        // Si hay estilos guardados, combinarlos con defaults (los guardados tienen prioridad)
        return { ...memoizedDefaults, ...savedStyles };
      }
      return memoizedDefaults;
    },
  );

  useEffect(() => {
    const currentStyles = styles.get(componentName);
    if (currentStyles && Object.keys(currentStyles).length > 0) {
      // Si hay estilos guardados, combinarlos con defaults (los guardados tienen prioridad)
      const mergedStyles = { ...memoizedDefaults, ...currentStyles };
      // Solo actualizar si realmente cambió
      setComponentStyles((prev) => {
        const currentStr = JSON.stringify(mergedStyles);
        const prevStr = JSON.stringify(prev);
        return currentStr !== prevStr ? mergedStyles : prev;
      });
    } else {
      // Solo actualizar si realmente cambió
      setComponentStyles((prev) => {
        const defaultStr = JSON.stringify(memoizedDefaults);
        const prevStr = JSON.stringify(prev);
        return defaultStr !== prevStr ? memoizedDefaults : prev;
      });
    }

    let channel: any = null;

    try {
      channel = subscribeToStyleChanges(componentName, (newStyle) => {
        setComponentStyles(newStyle.variables);
        // Guardar en localStorage cuando se actualice desde Supabase
        try {
          const currentStoreId = getRuntimeStoreIdSync();
          if (currentStoreId) {
            const storageKey = resolveScopedStorageKey(
              "osoria_component_styles",
              currentStoreId,
            );
            if (!storageKey) {
              return;
            }
            const savedStyles = localStorage.getItem(storageKey);
            const styles = savedStyles ? JSON.parse(savedStyles) : {};
            styles[componentName] = newStyle.variables;
            localStorage.setItem(storageKey, JSON.stringify(styles));
          }
        } catch (e) {
          console.warn("[v0] Error saving component style to localStorage:", e);
        }
      });
    } catch (error) {
      // Error silencioso para evitar spam en consola
    }

    return () => {
      if (channel && typeof channel.unsubscribe === "function") {
        channel.unsubscribe();
      }
    };
  }, [componentName, styles, memoizedDefaults]);

  return { styles: componentStyles, loading };
}
