# 🎨 Guía: Aplicar Estilo de Nicolukas.com a Tienda de Repostería

## ✅ Lo que ya está implementado

1. **ReposteriaLayout** - Aplica estilos automáticamente cuando el subdominio es `reposteria`
2. **Estilos CSS personalizados** - `globals-reposteria.css` con diseño inspirado en nicolukas.com
3. **Hero personalizado** - `ReposteriaHero` con diseño elegante
4. **Componente condicional** - Muestra contenido diferente según la tienda
5. **Fuentes elegantes** - Playfair Display (títulos) + Inter (texto)

## 🎨 Características del Diseño

### Colores
- **Primario**: `#FF6B9D` (Rosa pastel)
- **Secundario**: `#FFE5F1` (Rosa claro)
- **Acento**: `#FFB6D9` (Rosa medio)
- **Fondo**: `#FFFBF9` (Beige muy claro)
- **Texto**: `#2D1B1B` (Marrón oscuro elegante)

### Tipografía
- **Títulos**: Playfair Display (serif elegante)
- **Texto**: Inter (sans-serif moderna)

### Estilos
- Diseño limpio y minimalista
- Espaciado generoso
- Animaciones suaves
- Cards con sombras elegantes
- Gradientes sutiles

## 🚀 Pasos para Activar

### 1. Ejecutar Script SQL

En Supabase SQL Editor, ejecuta:

```sql
-- Actualizar tema de repostería
scripts/35-update-reposteria-theme.sql
```

### 2. Verificar que Funciona

1. Accede a `http://reposteria.localhost:3000` (o tu dominio de producción)
2. Deberías ver:
   - Colores pasteles (rosa)
   - Tipografía elegante (Playfair Display para títulos)
   - Diseño limpio y moderno
   - Hero section personalizado

### 3. Personalizar (Opcional)

Puedes modificar los colores en Supabase:

```sql
UPDATE public.stores
SET 
  primary_color = '#TU_COLOR_PRIMARIO',
  secondary_color = '#TU_COLOR_SECUNDARIO'
WHERE subdomain = 'reposteria';
```

## 📝 Componentes Personalizados

### Hero Section
- Título grande con Playfair Display
- Descripción elegante
- Botones con gradientes
- Decoración de fondo sutil

### Secciones
- Títulos centrados con línea decorativa
- Espaciado generoso (80px padding)
- Fondos alternados para contraste

### Productos
- Cards con sombras suaves
- Hover effects elegantes
- Imágenes con zoom suave

## 🎯 Próximos Pasos

1. **Agregar productos** de repostería a la base de datos
2. **Personalizar imágenes** del hero
3. **Ajustar textos** según tu marca
4. **Agregar más secciones** si es necesario

## 📚 Archivos Creados

- `app/reposteria-layout.tsx` - Layout que aplica estilos
- `app/globals-reposteria.css` - Estilos CSS específicos
- `components/sections/reposteria-hero.tsx` - Hero personalizado
- `components/sections/conditional-home-content.tsx` - Contenido condicional
- `scripts/35-update-reposteria-theme.sql` - Script de actualización

---

El diseño está inspirado en nicolukas.com con un estilo elegante y moderno perfecto para una tienda de repostería.

