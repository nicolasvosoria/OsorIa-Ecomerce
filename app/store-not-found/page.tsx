import { Card, CardDescription, CardHeader } from '@/components/ui/card'

// Este subdominio no resuelve a ninguna tienda: no hay dueño a quien ofrecerle
// una entrada ni catálogo al que mandar al visitante, así que el aviso no lleva
// ninguna salida (D1).
export default function StoreNotFound() {
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
            Aquí no hay ninguna tienda
          </h1>
          <CardDescription>
            Esta dirección no corresponde a ninguna tienda. Revisa que esté bien escrita.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
