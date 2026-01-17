import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function StoreNotFound() {
  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Tienda no encontrada</CardTitle>
          <CardDescription>
            La tienda que estás buscando no existe o no está disponible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Verifica que la URL sea correcta o contacta al administrador si crees que esto es un error.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/">Ir a la página principal</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/shop">Explorar tienda</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}











