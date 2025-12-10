# Script PowerShell para actualizar Next.js a la última versión

Write-Host "🔄 Actualizando Next.js y dependencias relacionadas..." -ForegroundColor Cyan

# Actualizar Next.js, React y React DOM
pnpm update next@latest react@latest react-dom@latest

# Actualizar tipos de TypeScript
pnpm update @types/react@latest @types/react-dom@latest @types/node@latest

# Actualizar eslint-config-next si existe
try {
    pnpm update eslint-config-next@latest
} catch {
    Write-Host "eslint-config-next no encontrado, omitiendo..." -ForegroundColor Yellow
}

Write-Host "✅ Actualización completada" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Versiones instaladas:" -ForegroundColor Cyan
pnpm list next react react-dom

Write-Host ""
Write-Host "🧪 Ejecuta 'pnpm build' para verificar que todo funciona correctamente" -ForegroundColor Yellow




