import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface Product {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  image: string
  badge?: string
  slug?: string
}

// Helper para generar slug desde el nombre
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function ProductCard({ product }: { product: Product }) {
  const productSlug = product.slug || generateSlug(product.name)
  
  return (
    <div className="bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <Link href={`/products/${productSlug}`} className="block">
        <div className="relative aspect-square cursor-pointer">
          <img src={product.image || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" />
          {product.badge && (
            <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">{product.badge}</Badge>
          )}
          {product.originalPrice && <Badge className="absolute top-2 left-2 bg-destructive text-white">VENTA</Badge>}
        </div>
      </Link>
      <div className="p-4">
        <Link href={`/products/${productSlug}`}>
          <h3 className="text-lg font-bold text-foreground mb-2 hover:text-primary transition-colors cursor-pointer">{product.name}</h3>
        </Link>
        <p className="text-sm text-muted-foreground mb-4">{product.description}</p>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xl font-bold text-primary">${product.price.toLocaleString("es-CO")}</span>
            {product.originalPrice && (
              <span className="text-sm text-muted-foreground line-through ml-2">
                ${product.originalPrice.toLocaleString("es-CO")}
              </span>
            )}
          </div>
        </div>
        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
          <Link href={`/products/${productSlug}`}>
            Ver detalles
          </Link>
        </Button>
      </div>
    </div>
  )
}
