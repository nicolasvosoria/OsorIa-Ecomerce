# 🎛️ Guía: Dashboard de Administrador

## ✅ Lo que está implementado

1. **Dashboard exclusivo** - `/dashboard` - Panel principal para administradores
2. **Redirección automática** - Los admins son redirigidos al dashboard al iniciar sesión
3. **Enlaces en el header** - Acceso rápido desde el menú de usuario
4. **Acceso a funcionalidades** - El admin puede seguir usando `/admin` y otras funciones

## 🚀 Funcionalidades del Dashboard

### Tarjetas de Acceso Rápido

El dashboard incluye tarjetas para acceder a:

1. **Productos** - Gestiona tu catálogo
2. **Pedidos** - Revisa y gestiona pedidos
3. **Usuarios** - Administra usuarios y permisos
4. **Editor de Página** - Edita el diseño de tu tienda (`/admin`)
5. **Estilos** - Personaliza estilos de componentes
6. **Temas** - Gestiona temas de la tienda
7. **Fuentes** - Configura fuentes personalizadas
8. **Tiendas** - Gestiona múltiples tiendas (multi-tenant)
9. **Reportes** - Ver estadísticas y reportes
10. **Configuración** - Ajustes generales del sistema

### Estadísticas (Placeholder)

El dashboard muestra tarjetas de estadísticas que puedes conectar con datos reales:
- Total Productos
- Pedidos Hoy
- Usuarios Registrados
- Ventas del Mes

## 🔄 Cómo Funciona

### Redirección Automática

Cuando un administrador inicia sesión:
1. El componente `AdminRedirect` detecta que es admin
2. Si está en la página principal (`/`), lo redirige a `/dashboard`
3. Solo redirige si no está ya en `/dashboard` o `/admin`

### Acceso Manual

Los administradores pueden acceder al dashboard:
- **Desde el header**: Click en el menú de usuario → "Dashboard"
- **URL directa**: `http://localhost:3000/dashboard`
- **Desde el editor**: Botón "Dashboard" en el header del editor

### Mantener Funcionalidades

El administrador puede seguir usando:
- ✅ `/admin` - Editor de página (funcionalidades de siempre)
- ✅ `/` - Página principal (con botón "Ver Tienda" en el dashboard)
- ✅ Todas las funcionalidades normales del sitio

## 📝 Personalización

### Agregar Nuevas Tarjetas

Edita `app/dashboard/page.tsx` y agrega nuevas tarjetas al array `dashboardCards`:

```typescript
{
  title: "Nueva Sección",
  description: "Descripción de la sección",
  icon: IconComponent,
  href: "/admin/nueva-seccion",
  color: "bg-blue-500",
}
```

### Conectar Estadísticas Reales

Puedes reemplazar los valores `"-"` en las tarjetas de estadísticas con datos reales:

```typescript
// Ejemplo: Obtener total de productos
const { data } = await getItems({ limit: 1 })
const totalProducts = data.total
```

## 🎯 Rutas Disponibles

- `/dashboard` - Dashboard principal (solo admins)
- `/admin` - Editor de página (solo admins, funcionalidades de siempre)
- `/` - Página principal (accesible para todos, pero admins son redirigidos)

## 🔐 Seguridad

- El dashboard verifica que el usuario sea administrador
- Si un usuario no admin intenta acceder, es redirigido a `/`
- Las rutas están protegidas con `AdminPermissionsProvider`

## 📚 Próximos Pasos

1. **Conectar estadísticas** con datos reales de la base de datos
2. **Crear páginas** para cada sección del dashboard (productos, pedidos, etc.)
3. **Agregar gráficos** y visualizaciones de datos
4. **Implementar notificaciones** para nuevos pedidos o eventos importantes

---

El dashboard está listo para usar. Los administradores serán redirigidos automáticamente cuando inicien sesión, pero pueden seguir accediendo a todas las funcionalidades normales.

