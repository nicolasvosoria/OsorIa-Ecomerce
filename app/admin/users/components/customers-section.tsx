"use client"

import { Mail, Phone, User } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable, type Column } from "@/components/admin/data-table"
import type { StoreCustomer } from "@/lib/supabase/store-customers-api"

type CustomersSectionProps = {
  customers: StoreCustomer[]
  state: "ready" | "empty" | "error"
}

export function CustomersSection({ customers, state }: CustomersSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Clientes</h2>
        <p className="text-sm text-muted-foreground">
          Personas que han comprado en tu tienda. Solo lectura.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            Clientes de la tienda{state === "ready" ? ` (${customers.length})` : ""}
          </CardTitle>
          <CardDescription>Se derivan de los pedidos de tu tienda.</CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <DataTable
            columns={CUSTOMER_COLUMNS}
            rows={customers}
            state={state}
            emptyMessage="Todavía no hay clientes con pedidos en tu tienda."
            errorMessage="No se pudieron cargar los clientes"
          />
        </CardContent>
      </Card>
    </section>
  )
}

const CUSTOMER_COLUMNS: Column<StoreCustomer>[] = [
  {
    key: "customer",
    header: "Cliente",
    cell: (customer) => (
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1">
          <div className="font-medium">{customer.name}</div>
          <Badge variant={customer.isRegistered ? "secondary" : "outline"}>
            {customer.isRegistered ? "Registrado" : "Invitado"}
          </Badge>
        </div>
      </div>
    ),
  },
  {
    key: "email",
    header: "Email",
    cell: (customer) => (
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <span>{customer.email}</span>
      </div>
    ),
  },
  {
    key: "phone",
    header: "Teléfono",
    cell: (customer) =>
      customer.phone ? (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span>{customer.phone}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "orders",
    header: "Pedidos",
    cell: (customer) => <span className="font-medium tabular-nums">{customer.orderCount}</span>,
  },
  {
    key: "lastOrder",
    header: "Último pedido",
    cell: (customer) =>
      customer.lastOrderAt ? (
        <span className="text-sm">{formatCustomerDate(customer.lastOrderAt)}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
]

function formatCustomerDate(value: string): string {
  return new Date(value).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
