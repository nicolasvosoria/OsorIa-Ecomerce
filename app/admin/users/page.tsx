"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAdminPermissions } from "@/contexts/admin-permissions-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Loader2, 
  ShieldAlert, 
  Users, 
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Mail,
  User,
} from "lucide-react"
import Link from "next/link"
import { getUsers } from "@/lib/supabase/users-api"
import type { UserProfile } from "@/lib/types/user"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function AdminUsersPage() {
  const { isAdmin, loading } = useAdminPermissions()
  const router = useRouter()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [totalUsers, setTotalUsers] = useState(0)

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/")
    }
  }, [isAdmin, loading, router])

  useEffect(() => {
    const loadUsers = async () => {
      if (!isAdmin) return
      
      setLoadingUsers(true)
      try {
        const result = await getUsers({
          limit: 100,
          order_by: 'created_at',
          order_direction: 'desc',
        })
        setUsers(result.users)
        setTotalUsers(result.total)
      } catch (error) {
        console.error("[Admin Users] Error al cargar usuarios:", error)
      } finally {
        setLoadingUsers(false)
      }
    }

    if (isAdmin) {
      loadUsers()
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
                  Gestión de Usuarios
                </h1>
                <p 
                  className="text-sm mt-1"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Administra usuarios y permisos del sistema
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loadingUsers ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No hay usuarios</CardTitle>
              <CardDescription>
                Los usuarios se crearán automáticamente al registrarse
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Lista de Usuarios ({totalUsers})</CardTitle>
              <CardDescription>
                Gestiona todos los usuarios registrados en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Fecha de Registro</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {user.first_name || user.last_name
                                  ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                  : 'Sin nombre'}
                              </div>
                              {user.first_name || user.last_name ? (
                                <div className="text-sm text-muted-foreground">
                                  ID: {user.id.substring(0, 8)}...
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.role === 'admin' ? (
                            <Badge variant="default" className="bg-purple-600">Administrador</Badge>
                          ) : (
                            <Badge variant="secondary">Usuario</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.created_at ? (
                            <div className="text-sm">
                              {new Date(user.created_at).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/admin/users/${user.id}/edit`}>
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


