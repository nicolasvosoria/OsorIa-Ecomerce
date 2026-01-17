# ============================================
# Script para configurar subdominios locales en Windows
# Ejecutar como Administrador
# ============================================

# Verificar que se ejecuta como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ Este script debe ejecutarse como Administrador" -ForegroundColor Red
    Write-Host "💡 Haz clic derecho en PowerShell y selecciona 'Ejecutar como administrador'" -ForegroundColor Yellow
    pause
    exit 1
}

$hostsFile = "$env:SystemRoot\System32\drivers\etc\hosts"
$subdomains = @(
    "reposteria.localhost",
    "default.localhost"
)
$ip = "127.0.0.1"

Write-Host "🔧 Configurando subdominios locales en archivo hosts..." -ForegroundColor Cyan
Write-Host ""

# Hacer backup del archivo hosts
$backupFile = "$hostsFile.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
try {
    Copy-Item -Path $hostsFile -Destination $backupFile -Force
    Write-Host "✅ Backup creado: $backupFile" -ForegroundColor Green
} catch {
    Write-Host "⚠️  No se pudo crear backup: $_" -ForegroundColor Yellow
}

# Leer el contenido actual
$hostsContent = Get-Content -Path $hostsFile -ErrorAction SilentlyContinue

# Agregar subdominios si no existen
$modified = $false
foreach ($subdomain in $subdomains) {
    $entry = "$ip`t$subdomain"
    
    # Verificar si ya existe
    $exists = $hostsContent | Where-Object { $_ -match [regex]::Escape($subdomain) }
    
    if ($exists) {
        Write-Host "✅ $subdomain ya está configurado" -ForegroundColor Green
    } else {
        # Agregar la entrada
        try {
            Add-Content -Path $hostsFile -Value $entry -Encoding ASCII
            Write-Host "✅ $subdomain agregado" -ForegroundColor Green
            $modified = $true
        } catch {
            Write-Host "❌ Error al agregar $subdomain : $_" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "📋 Verificando configuración:" -ForegroundColor Cyan
Get-Content -Path $hostsFile | Select-String -Pattern "localhost" | ForEach-Object {
    Write-Host "   $_" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🧪 Probando resolución DNS:" -ForegroundColor Cyan
foreach ($subdomain in $subdomains) {
    try {
        $result = [System.Net.Dns]::GetHostAddresses($subdomain)
        if ($result.IPAddressToString -eq $ip) {
            Write-Host "✅ $subdomain resuelve a $ip" -ForegroundColor Green
        } else {
            Write-Host "⚠️  $subdomain resuelve a $($result.IPAddressToString) (esperado: $ip)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  $subdomain no resuelve (esto es normal si el servidor no está corriendo)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🚀 Siguiente paso:" -ForegroundColor Cyan
Write-Host "   1. Inicia el servidor: pnpm dev (o npm run dev)" -ForegroundColor White
Write-Host "   2. Accede a: http://localhost:3000" -ForegroundColor White
Write-Host "   3. Accede a: http://reposteria.localhost:3000" -ForegroundColor White
Write-Host ""

if ($modified) {
    Write-Host "💡 Nota: Puede que necesites reiniciar el navegador para que los cambios surtan efecto" -ForegroundColor Yellow
}

Write-Host ""
pause
