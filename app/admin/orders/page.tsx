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
  Download,
} from "lucide-react"
import Link from "next/link"
import { getOrders, getOrderById, updateOrderStatus, type Order, type OrderWithItems } from "@/lib/supabase/orders-api"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import * as XLSX from "xlsx"

export default function AdminOrdersPage() {
  const { isAdmin, loading } = useAdminPermissions()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [totalOrders, setTotalOrders] = useState(0)
  const [downloadingExcel, setDownloadingExcel] = useState(false)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

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
      returned: { variant: "outline", label: "Devuelto" },
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

  // Función para obtener el texto del estado
  const getStatusText = (status: Order['status']): string => {
    const statusMap: Record<Order['status'], string> = {
      pending: "Pendiente",
      confirmed: "Confirmado",
      processing: "Procesando",
      shipped: "Enviado",
      delivered: "Entregado",
      returned: "Devuelto",
      cancelled: "Cancelado",
    }
    return statusMap[status] || status
  }

  const ORDER_STATUSES: Order['status'][] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'returned', 'cancelled']

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    setUpdatingOrderId(orderId)
    try {
      const ok = await updateOrderStatus(orderId, newStatus)
      if (ok) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)))
      }
    } finally {
      setUpdatingOrderId(null)
    }
  }

  // Función para obtener el texto del estado de pago
  const getPaymentStatusText = (status: Order['payment_status']): string => {
    const statusMap: Record<Order['payment_status'], string> = {
      pending: "Pendiente",
      paid: "Pagado",
      failed: "Fallido",
      refunded: "Reembolsado",
    }
    return statusMap[status] || status
  }

  // Función para descargar todos los pedidos en Excel
  const downloadOrdersToExcel = async () => {
    if (!isAdmin) return

    setDownloadingExcel(true)
    try {
      // Obtener todos los pedidos (sin límite)
      const result = await getOrders({
        limit: 10000, // Límite alto para obtener todos
        order_by: 'created_at',
        order_direction: 'desc',
      })

      // Obtener los items de cada pedido
      const ordersWithItems: Array<OrderWithItems> = await Promise.all(
        result.orders.map(async (order) => {
          const orderWithItems = await getOrderById(order.id)
          return orderWithItems || { ...order, items: [] }
        })
      )

      // Preparar datos para Excel - Hoja 1: Resumen de Pedidos
      const ordersData = ordersWithItems.map((order) => ({
        'Número de Pedido': order.order_number,
        'Fecha': new Date(order.order_date || order.created_at).toLocaleString('es-ES'),
        'Cliente': `${order.customer_first_name} ${order.customer_last_name}`,
        'Email': order.customer_email,
        'Teléfono': order.customer_phone || '',
        'Tipo Cliente': order.customer_type === 'guest' ? 'Invitado' : 'Usuario',
        'Dirección': order.shipping_address,
        'Ciudad': order.shipping_city,
        'Código Postal': order.shipping_postal_code,
        'País': order.shipping_country,
        'Estado': getStatusText(order.status),
        'Estado de Pago': getPaymentStatusText(order.payment_status),
        'Método de Pago': order.payment_method || '',
        'Referencia de Pago': order.payment_reference || '',
        'Subtotal': order.subtotal,
        'Envío': order.shipping_cost,
        'Impuestos': order.tax_amount,
        'Descuento': order.discount_amount,
        'Total': order.total_amount,
        'Moneda': order.currency_code,
        'Notas': order.notes || '',
        'Fecha Confirmación': order.confirmed_at ? new Date(order.confirmed_at).toLocaleString('es-ES') : '',
        'Fecha Envío': order.shipped_at ? new Date(order.shipped_at).toLocaleString('es-ES') : '',
        'Fecha Entrega': order.delivered_at ? new Date(order.delivered_at).toLocaleString('es-ES') : '',
        'Fecha Cancelación': order.cancelled_at ? new Date(order.cancelled_at).toLocaleString('es-ES') : '',
      }))

      // Preparar datos para Excel - Hoja 2: Items de Pedidos
      const itemsData: Array<{
        'Número de Pedido': string
        'Producto': string
        'SKU': string
        'Variante': string
        'Cantidad': number
        'Precio Unitario': number
        'Total': number
        'Moneda': string
      }> = []

      ordersWithItems.forEach((order) => {
        if (order.items && order.items.length > 0) {
          order.items.forEach((item) => {
            itemsData.push({
              'Número de Pedido': order.order_number,
              'Producto': item.product_name,
              'SKU': item.product_sku || '',
              'Variante': item.variant_title || '',
              'Cantidad': item.quantity,
              'Precio Unitario': item.unit_price,
              'Total': item.total_price,
              'Moneda': item.currency_code,
            })
          })
        } else {
          // Si no hay items, agregar una fila indicando que no hay productos
          itemsData.push({
            'Número de Pedido': order.order_number,
            'Producto': 'Sin productos',
            'SKU': '',
            'Variante': '',
            'Cantidad': 0,
            'Precio Unitario': 0,
            'Total': 0,
            'Moneda': order.currency_code,
          })
        }
      })

      // Crear workbook
      const workbook = XLSX.utils.book_new()

      // Crear hoja de resumen de pedidos
      const ordersWorksheet = XLSX.utils.json_to_sheet(ordersData)
      XLSX.utils.book_append_sheet(workbook, ordersWorksheet, 'Pedidos')

      // Crear hoja de items
      const itemsWorksheet = XLSX.utils.json_to_sheet(itemsData)
      XLSX.utils.book_append_sheet(workbook, itemsWorksheet, 'Items de Pedidos')

      // Ajustar ancho de columnas
      const ordersColWidths = [
        { wch: 18 }, // Número de Pedido
        { wch: 20 }, // Fecha
        { wch: 25 }, // Cliente
        { wch: 30 }, // Email
        { wch: 15 }, // Teléfono
        { wch: 12 }, // Tipo Cliente
        { wch: 40 }, // Dirección
        { wch: 20 }, // Ciudad
        { wch: 12 }, // Código Postal
        { wch: 15 }, // País
        { wch: 12 }, // Estado
        { wch: 15 }, // Estado de Pago
        { wch: 15 }, // Método de Pago
        { wch: 20 }, // Referencia de Pago
        { wch: 12 }, // Subtotal
        { wch: 12 }, // Envío
        { wch: 12 }, // Impuestos
        { wch: 12 }, // Descuento
        { wch: 12 }, // Total
        { wch: 8 },  // Moneda
        { wch: 30 }, // Notas
        { wch: 20 }, // Fecha Confirmación
        { wch: 20 }, // Fecha Envío
        { wch: 20 }, // Fecha Entrega
        { wch: 20 }, // Fecha Cancelación
      ]
      ordersWorksheet['!cols'] = ordersColWidths

      const itemsColWidths = [
        { wch: 18 }, // Número de Pedido
        { wch: 30 }, // Producto
        { wch: 15 }, // SKU
        { wch: 20 }, // Variante
        { wch: 10 }, // Cantidad
        { wch: 15 }, // Precio Unitario
        { wch: 15 }, // Total
        { wch: 8 },  // Moneda
      ]
      itemsWorksheet['!cols'] = itemsColWidths

      // Generar nombre del archivo con fecha
      const date = new Date()
      const dateStr = date.toISOString().split('T')[0]
      const fileName = `pedidos_${dateStr}.xlsx`

      // Descargar archivo
      XLSX.writeFile(workbook, fileName)

      console.log(`✅ Excel generado: ${fileName} con ${result.orders.length} pedidos`)
    } catch (error) {
      console.error("[Admin Orders] Error al generar Excel:", error)
      alert("Error al generar el archivo Excel. Por favor, intenta nuevamente.")
    } finally {
      setDownloadingExcel(false)
    }
  }

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: "var(--background)" }}
      >
        <Loader2 
          className="h-8 w-8 animate-spin" 
          style={{ color: "var(--foreground)" }}
        />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div 
        className="flex items-center justify-center h-screen p-4"
        style={{ backgroundColor: "var(--background)" }}
      >
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
    <div 
      className="min-h-screen" 
      style={{ 
        backgroundColor: "var(--background)",
        background: "linear-gradient(to bottom right, var(--background), var(--muted))"
      }}
    >
      {/* Header */}
      <header 
        className="border-b shadow-sm"
        style={{ 
          backgroundColor: "var(--card)",
          borderColor: "var(--border)"
        }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 
                  className="text-2xl font-bold"
                  style={{ color: "var(--foreground)" }}
                >
                  Gestión de Pedidos
                </h1>
                <p 
                  className="text-sm mt-1"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Revisa y gestiona todos los pedidos
                </p>
              </div>
            </div>
            <Button
              onClick={downloadOrdersToExcel}
              disabled={downloadingExcel || loadingOrders || orders.length === 0}
              className="gap-2"
            >
              {downloadingExcel ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando Excel...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Descargar Excel
                </>
              )}
            </Button>
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
                          <div className="flex items-center gap-2">
                            <Select
                              value={order.status}
                              onValueChange={(value) => handleStatusChange(order.id, value as Order['status'])}
                              disabled={updatingOrderId === order.id}
                            >
                              <SelectTrigger className="w-[140px] h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ORDER_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {getStatusText(s)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {updatingOrderId === order.id && (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                            )}
                          </div>
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

