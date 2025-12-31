import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PauseCircle } from 'lucide-react'

export default function StoreInactive() {
  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <PauseCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Tienda temporalmente inactiva</CardTitle>
          <CardDescription>
            Esta tienda no está disponible en este momento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            La tienda ha sido desactivada temporalmente. Por favor, intenta más tarde o contacta al administrador.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/">Ir a la página principal</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/shop">Explorar otras tiendas</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}





