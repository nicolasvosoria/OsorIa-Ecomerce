"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAdminPermissions } from "@/contexts/admin-permissions-context"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Loader2, 
  ShieldAlert, 
  Package, 
  ShoppingCart, 
  Users, 
  ArrowRight,
  Eye,
  Edit,
  BarChart3
} from "lucide-react"
import Link from "next/link"
// getDashboardStats se importa dinámicamente para evitar problemas con Turbopack
import { formatPrice } from "@/lib/shopify/utils"
// Importación dinámica de getDashboardStats para evitar problemas con Turbopack

function DashboardContent() {
  const { isAdmin, loading } = useAdminPermissions()
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalProducts: 0,
    ordersToday: 0,
    totalUsers: 0,
    monthlySales: 0,
  })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/")
    }
  }, [isAdmin, loading, router])

  // Cargar estadísticas desde la BD
  useEffect(() => {
    const loadStats = async () => {
      if (!isAdmin) return
      
      setLoadingStats(true)
      try {
        // Importación dinámica para evitar problemas con Turbopack durante el build
        const { getDashboardStats } = await import("@/lib/supabase/stats-api")
        const dashboardStats = await getDashboardStats()
        setStats(dashboardStats)
      } catch (error) {
        console.error("[Dashboard] Error al cargar estadísticas:", error)
      } finally {
        setLoadingStats(false)
      }
    }

    if (isAdmin) {
      loadStats()
    }
  }, [isAdmin])

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

  // Solo mostrar opciones de productos, pedidos y usuarios
  const dashboardCards = [
    {
      title: "Productos",
      description: "Gestiona tu catálogo de productos",
      icon: Package,
      href: "/admin/products",
      color: "bg-blue-500",
      count: stats.totalProducts,
    },
    {
      title: "Pedidos",
      description: "Revisa y gestiona pedidos",
      icon: ShoppingCart,
      href: "/admin/orders",
      color: "bg-green-500",
      count: stats.ordersToday,
    },
    {
      title: "Usuarios",
      description: "Administra usuarios y permisos",
      icon: Users,
      href: "/admin/users",
      color: "bg-purple-500",
      count: stats.totalUsers,
    },
    {
      title: "Estadísticas y Reportes",
      description: "Visualiza análisis detallados",
      icon: BarChart3,
      href: "/admin/stats",
      color: "bg-indigo-500",
    },
    {
      title: "Editor de Página",
      description: "Edita el diseño de tu tienda",
      icon: Edit,
      href: "/admin",
      color: "bg-orange-500",
    },
  ]

  return (
    <div 
      className="min-h-screen" 
      style={{ 
        backgroundColor: "var(--background)",
        // Usar un gradiente sutil basado en el tema
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
            <div>
              <h1 
                className="text-2xl font-bold"
                style={{ color: "var(--foreground)" }}
              >
                Panel de Administración
              </h1>
              <p 
                className="text-sm mt-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                Bienvenido, {user?.first_name || user?.email}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Tienda
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin">
                  <Edit className="h-4 w-4 mr-2" />
                  Editor
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Productos</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalProducts}</div>
                  <p className="text-xs text-muted-foreground">En catálogo</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pedidos Hoy</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.ordersToday}</div>
                  <p className="text-xs text-muted-foreground">Nuevos pedidos</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Usuarios</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">Registrados</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Ventas del Mes</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatPrice(stats.monthlySales.toString(), "COP")}
                  </div>
                  <p className="text-xs text-muted-foreground">Total</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {dashboardCards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.href} className="hover:shadow-lg transition-shadow cursor-pointer group">
                <Link href={card.href}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className={`${card.color} p-3 rounded-lg`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                    <CardTitle className="mt-4">{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                    {card.count !== undefined && (
                      <div className="mt-2">
                        <span className="text-2xl font-bold text-primary">{card.count}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {card.title === "Productos" && "productos"}
                          {card.title === "Pedidos" && "hoy"}
                          {card.title === "Usuarios" && "usuarios"}
                        </span>
                      </div>
                    )}
                  </CardHeader>
                </Link>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 
            className="text-xl font-semibold mb-4"
            style={{ color: "var(--foreground)" }}
          >
            Accesos Rápidos
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/">
                <Eye className="h-4 w-4 mr-2" />
                Ver Tienda Pública
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin">
                <Edit className="h-4 w-4 mr-2" />
                Editor de Página
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/shop">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Catálogo de Productos
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}









