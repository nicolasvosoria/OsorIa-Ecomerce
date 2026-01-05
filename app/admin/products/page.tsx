"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAdminPermissions } from "@/contexts/admin-permissions-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Loader2, 
  ShieldAlert, 
  Package, 
  Plus,
  Edit,
  Trash2,
  Eye,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import { getItems } from "@/lib/supabase/products-api"
import type { StoreItemWithDetails } from "@/lib/types/products"
import { formatPrice } from "@/lib/shopify/utils"
import Image from "next/image"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function AdminProductsPage() {
  const { isAdmin, loading } = useAdminPermissions()
  const router = useRouter()
  const [products, setProducts] = useState<StoreItemWithDetails[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/")
    }
  }, [isAdmin, loading, router])

  useEffect(() => {
    const loadProducts = async () => {
      if (!isAdmin) return
      
      setLoadingProducts(true)
      try {
        const result = await getItems({
          limit: 100,
          order_by: 'created_at',
          order_direction: 'desc',
        })
        setProducts(result.items)
      } catch (error) {
        console.error("[Admin Products] Error al cargar productos:", error)
      } finally {
        setLoadingProducts(false)
      }
    }

    if (isAdmin) {
      loadProducts()
    }
  }, [isAdmin])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <CardTitle>Acceso Denegado</CardTitle>
            </div>
            <CardDescription>
              No tienes permisos para acceder a esta página.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">Volver al Inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Productos</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Administra tu catálogo de productos
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/admin/products/create">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Producto
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loadingProducts ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No hay productos</CardTitle>
              <CardDescription className="mb-4">
                Comienza creando tu primer producto
              </CardDescription>
              <Button asChild>
                <Link href="/admin/products/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Producto
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Lista de Productos ({products.length})</CardTitle>
              <CardDescription>
                Gestiona todos tus productos desde aquí
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Imagen</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted">
                            {product.primary_image_url ? (
                              <Image
                                src={product.primary_image_url}
                                alt={product.primary_image_alt || product.item_name}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                                Sin imagen
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{product.item_name}</div>
                          {product.item_code && (
                            <div className="text-sm text-muted-foreground">
                              Código: {product.item_code}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.category?.category_name || (
                            <span className="text-muted-foreground">Sin categoría</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatPrice(product.base_price.toString(), product.currency_code)}
                          </div>
                          {product.compare_at_price && (
                            <div className="text-sm text-muted-foreground line-through">
                              {formatPrice(product.compare_at_price.toString(), product.currency_code)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{product.inventory_quantity}</div>
                          {product.track_inventory && product.inventory_quantity <= product.low_stock_threshold && (
                            <Badge variant="destructive" className="text-xs mt-1">
                              Stock bajo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {product.is_active ? (
                              <Badge variant="default" className="w-fit">Activo</Badge>
                            ) : (
                              <Badge variant="secondary" className="w-fit">Inactivo</Badge>
                            )}
                            {product.is_featured && (
                              <Badge variant="outline" className="w-fit">Destacado</Badge>
                            )}
                            {!product.is_available_for_sale && (
                              <Badge variant="outline" className="w-fit">No disponible</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {product.item_slug && (
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/products/${product.item_slug}`} target="_blank">
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/admin/products/${product.id}/edit`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}


