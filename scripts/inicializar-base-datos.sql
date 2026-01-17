-- ============================================
-- SCRIPT DE INICIALIZACIÓN COMPLETA DE BASE DE DATOS
-- Ejecutar en el SQL Editor de Supabase
-- Este script ejecuta todos los scripts necesarios en orden
-- ============================================

-- NOTA: Este es un script de referencia. Ejecuta cada script individualmente
-- en el orden indicado para mejor control y debugging.

-- ============================================
-- ORDEN DE EJECUCIÓN:
-- ============================================

-- 1. PERFILES DE USUARIO
-- Ejecutar: 19-create-user-profiles-table.sql
-- Crea la tabla user_profiles para almacenar información adicional de usuarios

-- 2. TEMAS Y ESTILOS
-- Ejecutar: 01-create-themes-table.sql
-- Ejecutar: 01-create-component-styles-table.sql
-- Ejecutar: 04-create-fonts-table.sql
-- Crea las tablas para personalización visual de la tienda

-- 3. PRODUCTOS
-- Ejecutar: 20-create-products-tables.sql
-- Crea las tablas de productos, categorías e imágenes

-- 4. TIENDAS (MULTI-TIENDA)
-- Ejecutar: 30-create-stores-table.sql
-- Crea la tabla de tiendas y la función get_store_by_subdomain

-- 5. RELACIONAR PRODUCTOS CON TIENDAS
-- Ejecutar: 31-add-store-id-to-products.sql
-- Agrega store_id a productos y categorías

-- 6. PEDIDOS
-- Ejecutar: 29-create-orders-tables.sql
-- Crea las tablas de pedidos y items de pedido

-- 7. RELACIONAR PEDIDOS CON TIENDAS
-- Ejecutar: 32-add-store-id-to-orders.sql
-- Agrega store_id a pedidos

-- 8. RELACIONAR ESTILOS CON TIENDAS
-- Ejecutar: 33-add-store-id-to-styles.sql
-- Agrega store_id a temas y estilos

-- 9. CONFIGURAR RLS (Row Level Security)
-- Ejecutar: 18-fix-rls-y-datos-final.sql
-- Configura las políticas de seguridad

-- 10. CREAR TIENDA DE EJEMPLO
-- Ejecutar: 34-create-reposteria-store.sql
-- Crea la tienda "reposteria" de ejemplo

-- 11. CONFIGURAR TEMA PARA REPOSTERÍA
-- Ejecutar: 35-update-reposteria-theme.sql
-- Configura el tema visual para la tienda de repostería

-- ============================================
-- SCRIPTS OPCIONALES:
-- ============================================

-- 21-add-user-roles.sql - Agregar roles de usuario
-- 22-create-cart-tables.sql - Tabla de carritos (si no usas Shopify)
-- 23-create-admin-user.sql - Crear usuario administrador
-- 27-insert-sample-products.sql - Insertar productos de ejemplo
-- 27-setup-storage-bucket.sql - Configurar bucket de almacenamiento

-- ============================================
-- VERIFICACIÓN FINAL:
-- ============================================

-- Verificar que todas las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verificar que la función get_store_by_subdomain existe
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_store_by_subdomain';

-- Verificar que existe al menos una tienda
SELECT id, subdomain, store_name, is_active
FROM public.stores;

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
