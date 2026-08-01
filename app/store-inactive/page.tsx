import Link from 'next/link'
import { headers } from 'next/headers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { resolveStoreNameFromHeader } from '@/lib/stores/store-name-header'

// El panel de publicación vive en /admin/settings. `next` es el parámetro de
// intención de retorno que ya emiten el proxy y el callback de auth, y que
// `normalizeAuthReturnPath` solo acepta si apunta bajo /admin: reutilizarlo deja
// el enlace dentro del guard de open redirect que ya existe (D4).
const OWNER_LOGIN_HREF = `/auth/login?${new URLSearchParams({ next: '/admin/settings' }).toString()}`

export default async function StoreInactive() {
  // El proxy reescribe aquí el storefront de una tienda que existe pero no está
  // live, y estampa su identidad en los headers de la petición: nombrarla es
  // enseñarle al visitante *esa* tienda, nunca la plataforma. Si el header no
  // llega, el aviso se queda sin nombre en vez de inventar uno.
  const storeName = resolveStoreNameFromHeader((await headers()).get('x-store-name'))

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {/* El aviso es toda la página: su título tiene que ser un encabezado
              real para que un lector de pantalla tenga dónde aterrizar.
              `CardTitle` pinta un <div> y no acepta `asChild`, y la primitiva se
              comparte con storefront y admin, así que el <h1> se queda aquí con
              las clases que esa primitiva ya resolvía. */}
          <h1 className="font-semibold text-2xl tracking-tight">
            {storeName ? `${storeName} todavía no está abierta` : 'Esta tienda todavía no está abierta'}
          </h1>
          <CardDescription>
            Cuando abra, aparecerá en esta misma dirección.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-1">
          <p className="text-sm text-muted-foreground">¿Administras esta tienda?</p>
          {/* Subrayado en reposo, no solo al hover: la variante `link` se
              distingue del texto de arriba únicamente por `--primary`, que cada
              tienda elige, y hay presets donde `primary` y `foreground` valen lo
              mismo. Ahí la única entrada del dueño al producto desaparecería.
              Acotado a esta llamada: la variante se comparte con la consola. */}
          <Button variant="link" asChild className="underline underline-offset-4">
            <Link href={OWNER_LOGIN_HREF}>Iniciar sesión y gestionar su publicación</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
