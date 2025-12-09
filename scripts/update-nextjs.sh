#!/bin/bash
# Script para actualizar Next.js a la última versión

echo "🔄 Actualizando Next.js y dependencias relacionadas..."

# Actualizar Next.js, React y React DOM
pnpm update next@latest react@latest react-dom@latest

# Actualizar tipos de TypeScript
pnpm update @types/react@latest @types/react-dom@latest @types/node@latest

# Actualizar eslint-config-next si existe
pnpm update eslint-config-next@latest 2>/dev/null || echo "eslint-config-next no encontrado, omitiendo..."

echo "✅ Actualización completada"
echo ""
echo "📦 Versiones instaladas:"
pnpm list next react react-dom

echo ""
echo "🧪 Ejecuta 'pnpm build' para verificar que todo funciona correctamente"

