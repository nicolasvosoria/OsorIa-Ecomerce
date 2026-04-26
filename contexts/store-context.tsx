"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { PublicHomeDiscountPopupConfig } from "@/lib/home-discount-popup";
import { resolveStoreLookupSubdomain } from "@/lib/utils/store-host";

interface Store {
  id: string;
  subdomain: string;
  store_name: string;
  domain: string;
  is_active: boolean;
  is_public: boolean;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  currency_code: string;
  metadata?: Record<string, any>;
  homeDiscountPopup?: PublicHomeDiscountPopupConfig | null;
}

interface StoreContextType {
  store: Store | null;
  storeId: string | null;
  isLoading: boolean;
  error: string | null;
  refreshStore: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStore = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Verificar si multi-tenant está deshabilitado
      const disableMultiTenant =
        process.env.NEXT_PUBLIC_DISABLE_SUBDOMAIN_MULTI_TENANT === "true";
      const defaultStoreId =
        process.env.NEXT_PUBLIC_DEFAULT_STORE_ID || "default";

      // Obtener store_id del header (establecido por middleware) o cookie
      let storeId: string | null = null;

      // En el cliente, obtener de la cookie
      if (typeof document !== "undefined") {
        const cookies = document.cookie.split(";");
        const storeIdCookie = cookies.find((c) =>
          c.trim().startsWith("store_id="),
        );
        if (storeIdCookie) {
          storeId = storeIdCookie.split("=")[1];
        }
      }

      // Si multi-tenant está deshabilitado, usar store_id por defecto
      if (disableMultiTenant) {
        storeId = defaultStoreId;
      }

      // Si no hay store_id, usar 'default' o obtener del subdominio
      if (!storeId && !disableMultiTenant) {
        // Obtener subdominio del hostname
        const hostname =
          typeof window !== "undefined" ? window.location.hostname : "";
        const subdomain = resolveStoreLookupSubdomain(hostname);

        // Llamar a la API para obtener la tienda
        const response = await fetch(
          `/api/store?subdomain=${encodeURIComponent(subdomain)}`,
        );
        if (response.ok) {
          const storeData = await response.json();
          if (storeData) {
            setStore(storeData);
            setIsLoading(false);
            return;
          }
        }
      } else if (storeId) {
        // Obtener tienda por ID
        const response = await fetch(
          `/api/store?id=${encodeURIComponent(storeId)}`,
        );
        if (response.ok) {
          const storeData = await response.json();
          if (storeData) {
            setStore(storeData);
            setIsLoading(false);
            return;
          }
        }
      }

      // Si no se encontró tienda, usar valores por defecto
      setStore({
        id: "default",
        subdomain: "default",
        store_name: "Tienda Principal",
        domain: typeof window !== "undefined" ? window.location.hostname : "",
        is_active: true,
        is_public: true,
        currency_code: "COP",
      });
    } catch (err) {
      console.error("[Store] Error al cargar tienda:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");

      // Usar valores por defecto en caso de error
      setStore({
        id: "default",
        subdomain: "default",
        store_name: "Tienda Principal",
        domain: typeof window !== "undefined" ? window.location.hostname : "",
        is_active: true,
        is_public: true,
        currency_code: "COP",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // StoreProvider es client-side; diferir la carga evita setState síncrono
    // dentro del efecto y mantiene el fallback durante el prerender.
    const timeoutId = window.setTimeout(() => {
      void loadStore();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const refreshStore = async () => {
    await loadStore();
  };

  return (
    <StoreContext.Provider
      value={{
        store,
        storeId: store?.id || null,
        isLoading,
        error,
        refreshStore,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useStore debe usarse dentro de un StoreProvider");
  }
  return context;
}
