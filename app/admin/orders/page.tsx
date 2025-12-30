"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAdminPermissions } from "@/contexts/admin-permissions-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Loader2, 
  ShieldAlert, 
  ShoppingCart, 
  Eye,
  ArrowLeft,
  Package,
} from "lucide-react"
import Link from "next/link"
import { getOrders } from "@/lib/supabase/orders-api"
import type { Order } from "@/lib/supabase/orders-api"
import { formatPrice } from "@/lib/shopify/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function AdminOrdersPage() {
  const { isAdmin, loading } = useAdminPermissions()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [totalOrders, setTotalOrders] = useState(0)

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/")
    }
  }, [isAdmin, loading, router])

  useEffect(() => {
    const loadOrders = async () => {
      if (!isAdmin) return
      
      setLoadingOrders(true)
      try {
        const result = await getOrders({
          limit: 100,
          order_by: 'created_at',
          order_direction: 'desc',
        })
        setOrders(result.orders)
        setTotalOrders(result.total)
      } catch (error) {
        console.error("[Admin Orders] Error al cargar pedidos:", error)
      } finally {
        setLoadingOrders(false)
      }
    }

    if (isAdmin) {
      loadOrders()
    }
  }, [isAdmin])

  const getStatusBadge = (status: Order['status']) => {
    const variants: Record<Order['status'], { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "secondary", label: "Pendiente" },
      confirmed: { variant: "default", label: "Confirmado" },
      processing: { variant: "default", label: "Procesando" },
      shipped: { variant: "outline", label: "Enviado" },
      delivered: { variant: "default", label: "Entregado" },
      cancelled: { variant: "destructive", label: "Cancelado" },
    }
    const config = variants[status] || { variant: "secondary" as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getPaymentStatusBadge = (status: Order['payment_status']) => {
    const variants: Record<Order['payment_status'], { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "secondary", label: "Pendiente" },
      paid: { variant: "default", label: "Pagado" },
      failed: { variant: "destructive", label: "Fallido" },
      refunded: { variant: "outline", label: "Reembolsado" },
    }
    const config = variants[status] || { variant: "secondary" as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

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
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Pedidos</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Revisa y gestiona todos los pedidos
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loadingOrders ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No hay pedidos</CardTitle>
              <CardDescription>
                Los pedidos aparecerán aquí cuando los clientes realicen compras
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Lista de Pedidos ({totalOrders})</CardTitle>
              <CardDescription>
                Gestiona todos los pedidos del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número de Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Pago</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="font-medium">{order.order_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {order.customer_type === 'guest' ? 'Invitado' : 'Usuario'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {order.customer_first_name} {order.customer_last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {order.customer_email}
                            </div>
                            {order.customer_phone && (
                              <div className="text-sm text-muted-foreground">
                                {order.customer_phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(order.order_date || order.created_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatPrice(order.total_amount.toString(), order.currency_code)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Envío: {formatPrice(order.shipping_cost.toString(), order.currency_code)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(order.payment_status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/orders/${order.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
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

