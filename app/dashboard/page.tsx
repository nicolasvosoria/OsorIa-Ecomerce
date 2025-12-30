"use client"

import { Suspense, useEffect } from "react"
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
  Settings, 
  BarChart3,
  FileText,
  Image as ImageIcon,
  Palette,
  Type,
  Store,
  ArrowRight,
  Eye,
  Edit
} from "lucide-react"
import Link from "next/link"

function DashboardContent() {
  const { isAdmin, loading } = useAdminPermissions()
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/")
    }
  }, [isAdmin, loading, router])

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

  const dashboardCards = [
    {
      title: "Productos",
      description: "Gestiona tu catálogo de productos",
      icon: Package,
      href: "/admin/products",
      color: "bg-blue-500",
    },
    {
      title: "Pedidos",
      description: "Revisa y gestiona pedidos",
      icon: ShoppingCart,
      href: "/admin/orders",
      color: "bg-green-500",
    },
    {
      title: "Usuarios",
      description: "Administra usuarios y permisos",
      icon: Users,
      href: "/admin/users",
      color: "bg-purple-500",
    },
    {
      title: "Editor de Página",
      description: "Edita el diseño de tu tienda",
      icon: Edit,
      href: "/admin",
      color: "bg-orange-500",
    },
    {
      title: "Estilos",
      description: "Personaliza estilos de componentes",
      icon: Palette,
      href: "/admin/styles",
      color: "bg-pink-500",
    },
    {
      title: "Temas",
      description: "Gestiona temas de la tienda",
      icon: ImageIcon,
      href: "/admin/themes",
      color: "bg-indigo-500",
    },
    {
      title: "Fuentes",
      description: "Configura fuentes personalizadas",
      icon: Type,
      href: "/admin/fonts",
      color: "bg-teal-500",
    },
    {
      title: "Tiendas",
      description: "Gestiona múltiples tiendas",
      icon: Store,
      href: "/admin/stores",
      color: "bg-cyan-500",
    },
    {
      title: "Reportes",
      description: "Ver estadísticas y reportes",
      icon: BarChart3,
      href: "/admin/reports",
      color: "bg-yellow-500",
    },
    {
      title: "Configuración",
      description: "Ajustes generales del sistema",
      icon: Settings,
      href: "/admin/settings",
      color: "bg-gray-500",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
              <p className="text-sm text-gray-600 mt-1">
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
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">En catálogo</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pedidos Hoy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Nuevos pedidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Usuarios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Registrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Ventas del Mes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Total</p>
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
                  </CardHeader>
                </Link>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Accesos Rápidos</h2>
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

