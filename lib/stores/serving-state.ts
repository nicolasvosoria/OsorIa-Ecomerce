// Lo que el público ve hoy de una tienda, resuelto desde las dos banderas que
// nunca deben confundirse: `is_active` es la suspensión que decide la plataforma
// e `is_public` la publicación que decide el dueño.
export type StoreServingState = "live" | "unpublished" | "suspended"

export type StoreLifecycleFlags = { isActive: boolean; isPublic: boolean }

// La suspensión gana sobre la publicación: una tienda suspendida y sin publicar
// sigue siendo un caso de suspensión, porque el único control que el dueño tiene
// —publicar— no la va a encender.
export function resolveStoreServingState({
  isActive,
  isPublic,
}: StoreLifecycleFlags): StoreServingState {
  if (!isActive) {
    return "suspended"
  }

  if (!isPublic) {
    return "unpublished"
  }

  return "live"
}
