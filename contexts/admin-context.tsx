"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/auth-context";
import { isCurrentUserAdmin } from "@/lib/supabase/permissions-api";

interface AdminContextType {
  isEditMode: boolean;
  isAdmin: boolean;
  selectedComponent: string | null;
  selectComponent: (componentName: string | null) => void;
  componentEdits: Map<string, Record<string, any>>;
  updateComponentEdit: (componentName: string, key: string, value: any) => void;
  scheduleComponentEdit: (
    componentName: string,
    key: string,
    value: any,
    delay?: number,
  ) => void;
  flushScheduledEdits: (componentName?: string) => void;
  clearComponentEdits: (componentName: string) => void;
  getAllEdits: () => Map<string, Record<string, any>>;
  getComponentEditsSnapshot: (componentName: string) => Record<string, any>;
  toggleEditMode: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(
    null,
  );
  const [componentEdits, setComponentEdits] = useState<
    Map<string, Record<string, any>>
  >(new Map());
  const [isAdmin, setIsAdmin] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const pendingEditsRef = useState(
    () => new Map<string, Map<string, any>>(),
  )[0];
  const scheduledTimeoutsRef = useState(
    () => new Map<string, ReturnType<typeof setTimeout>>(),
  )[0];

  // Verificar si el usuario es admin cuando cambia la autenticación
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (isAuthenticated && user) {
        try {
          const adminStatus = await isCurrentUserAdmin();
          setIsAdmin(adminStatus);
          // Si el usuario deja de ser admin, desactivar modo edición
          if (!adminStatus) {
            setIsEditMode(false);
            setSelectedComponent(null);
          }
        } catch (error) {
          console.error("[Admin] Error verificando rol de admin:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
        setIsEditMode(false);
        setSelectedComponent(null);
      }
    };

    checkAdminStatus();
  }, [isAuthenticated, user]);

  const toggleEditMode = () => {
    if (!isAdmin) {
      console.warn(
        "[Admin] Intento de activar modo edición sin permisos de admin",
      );
      return;
    }
    setIsEditMode((prev) => {
      const newValue = !prev;
      console.log(
        "[Admin] Modo edición:",
        newValue ? "ACTIVADO" : "DESACTIVADO",
      );
      if (!newValue) {
        // Si se desactiva, limpiar selección
        setSelectedComponent(null);
      }
      return newValue;
    });
  };

  const selectComponent = (componentName: string | null) => {
    if (!isAdmin || !isEditMode) return;
    setSelectedComponent(componentName);
  };

  const updateComponentEdit = (
    componentName: string,
    key: string,
    value: any,
  ) => {
    if (!isAdmin) return;
    setComponentEdits((prev) => {
      const newMap = new Map(prev);
      const currentEdits = newMap.get(componentName) || {};
      if (currentEdits[key] === value) {
        return prev;
      }
      newMap.set(componentName, { ...currentEdits, [key]: value });
      return newMap;
    });
  };

  const commitPendingEdit = (componentName: string, key: string) => {
    const componentPending = pendingEditsRef.get(componentName);
    if (!componentPending || !componentPending.has(key)) return;

    const value = componentPending.get(key);
    componentPending.delete(key);
    if (componentPending.size === 0) {
      pendingEditsRef.delete(componentName);
    }

    scheduledTimeoutsRef.delete(`${componentName}:${key}`);
    updateComponentEdit(componentName, key, value);
  };

  const scheduleComponentEdit = (
    componentName: string,
    key: string,
    value: any,
    delay = 120,
  ) => {
    if (!isAdmin) return;

    const componentPending =
      pendingEditsRef.get(componentName) || new Map<string, any>();
    componentPending.set(key, value);
    pendingEditsRef.set(componentName, componentPending);

    const timeoutKey = `${componentName}:${key}`;
    const existingTimeout = scheduledTimeoutsRef.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeoutId = setTimeout(
      () => commitPendingEdit(componentName, key),
      delay,
    );
    scheduledTimeoutsRef.set(timeoutKey, timeoutId);
  };

  const flushScheduledEdits = (componentName?: string) => {
    if (!isAdmin) return;

    const pendingKeys = Array.from(scheduledTimeoutsRef.keys());
    pendingKeys.forEach((timeoutKey) => {
      const [pendingComponent, pendingKey] = timeoutKey.split(":");
      if (componentName && pendingComponent !== componentName) return;

      const timeoutId = scheduledTimeoutsRef.get(timeoutKey);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      commitPendingEdit(pendingComponent, pendingKey);
    });
  };

  const clearComponentEdits = (componentName: string) => {
    if (!isAdmin) return;

    pendingEditsRef.delete(componentName);

    Array.from(scheduledTimeoutsRef.entries()).forEach(
      ([timeoutKey, timeoutId]) => {
        if (!timeoutKey.startsWith(`${componentName}:`)) return;

        clearTimeout(timeoutId);
        scheduledTimeoutsRef.delete(timeoutKey);
      },
    );

    setComponentEdits((prev) => {
      const newMap = new Map(prev);
      newMap.delete(componentName);
      return newMap;
    });
  };

  const getComponentEditsSnapshot = (componentName: string) => {
    const committedEdits = componentEdits.get(componentName) || {};
    const pendingEdits = pendingEditsRef.get(componentName);

    if (!pendingEdits || pendingEdits.size === 0) {
      return committedEdits;
    }

    return {
      ...committedEdits,
      ...Object.fromEntries(pendingEdits.entries()),
    };
  };

  const getAllEdits = () => {
    const mergedEdits = new Map(componentEdits);

    pendingEditsRef.forEach((_pendingValues, componentName) => {
      mergedEdits.set(componentName, getComponentEditsSnapshot(componentName));
    });

    return mergedEdits;
  };

  return (
    <AdminContext.Provider
      value={{
        isEditMode,
        isAdmin,
        selectedComponent,
        selectComponent,
        componentEdits,
        updateComponentEdit,
        scheduleComponentEdit,
        flushScheduledEdits,
        clearComponentEdits,
        getAllEdits,
        getComponentEditsSnapshot,
        toggleEditMode,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    return {
      isEditMode: false,
      isAdmin: false,
      selectedComponent: null,
      selectComponent: () => {},
      componentEdits: new Map(),
      updateComponentEdit: () => {},
      scheduleComponentEdit: () => {},
      flushScheduledEdits: () => {},
      clearComponentEdits: () => {},
      getAllEdits: () => new Map(),
      getComponentEditsSnapshot: () => ({}),
      toggleEditMode: () => {},
    };
  }
  return context;
}
