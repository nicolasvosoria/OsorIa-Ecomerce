#!/bin/bash

# Script para configurar el archivo hosts en Linux/Mac
# Ejecuta con: sudo bash configurar-hosts.sh

HOSTS_FILE="/etc/hosts"
SUBDOMAIN="reposteria.localhost"
IP="127.0.0.1"

echo "🔧 Configurando subdominio en archivo hosts..."

# Verificar si ya existe
if grep -q "$SUBDOMAIN" "$HOSTS_FILE"; then
    echo "✅ El subdominio $SUBDOMAIN ya está configurado en /etc/hosts"
    grep "$SUBDOMAIN" "$HOSTS_FILE"
else
    # Agregar la entrada
    echo "$IP    $SUBDOMAIN" | sudo tee -a "$HOSTS_FILE" > /dev/null
    echo "✅ Subdominio $SUBDOMAIN agregado a /etc/hosts"
fi

echo ""
echo "📋 Verificando configuración:"
grep "$SUBDOMAIN" "$HOSTS_FILE" || echo "⚠️  No se encontró la entrada"

echo ""
echo "🧪 Probando resolución DNS:"
ping -c 1 "$SUBDOMAIN" 2>/dev/null && echo "✅ El subdominio resuelve correctamente" || echo "⚠️  El subdominio no resuelve (esto es normal si el servidor no está corriendo)"

echo ""
echo "🚀 Siguiente paso:"
echo "   1. Inicia el servidor: pnpm dev"
echo "   2. Accede a: http://reposteria.localhost:3000"







