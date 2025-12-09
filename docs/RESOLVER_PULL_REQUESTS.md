# Guía para Resolver Pull Requests

## Estado Actual del Repositorio

### Ramas:
- **main**: Rama principal (versión estable)
- **New-Features**: Rama con nuevas características (7733+ líneas de cambios)

### Cambios en New-Features:
- Sistema de autenticación completo
- Recuperación de contraseña
- Chatbot integrado
- Base de datos de productos
- Temas y tipografías personalizables
- Carrito de compras
- Documentación completa

## Pasos para Resolver Pull Requests

### Opción 1: Merge desde GitHub (Recomendado)

1. **Ve a GitHub:**
   - `https://github.com/nicolasvosoria/OsorIa-Ecomerce`

2. **Crear Pull Request:**
   - Haz clic en **Pull requests**
   - **New Pull Request**
   - Base: `main` ← Compare: `New-Features`
   - Revisa los cambios
   - **Create Pull Request**

3. **Revisar y Merge:**
   - Revisa los archivos cambiados
   - Verifica que no haya conflictos
   - Si todo está bien, haz clic en **Merge Pull Request**

### Opción 2: Merge desde Terminal

Si prefieres hacerlo desde la terminal:

```bash
# 1. Asegúrate de estar en la rama main
git checkout main

# 2. Actualiza main con los últimos cambios
git pull osoria main

# 3. Haz merge de New-Features
git merge New-Features

# 4. Si hay conflictos, resuélvelos y luego:
git add .
git commit -m "Merge New-Features into main"

# 5. Sube los cambios
git push osoria main
```

## Verificar Conflictos

Antes de hacer merge, verifica si hay conflictos:

```bash
# Ver diferencias
git diff main..New-Features

# Intentar merge en modo dry-run
git merge --no-commit --no-ff New-Features
git merge --abort  # Si hay conflictos, cancela
```

## Resolver Conflictos (si los hay)

Si hay conflictos durante el merge:

1. **Git te mostrará los archivos con conflictos**
2. **Abre cada archivo y busca las marcas:**
   ```
   <<<<<<< HEAD
   código de main
   =======
   código de New-Features
   >>>>>>> New-Features
   ```

3. **Resuelve manualmente:**
   - Decide qué código mantener
   - Elimina las marcas de conflicto
   - Guarda el archivo

4. **Marca como resuelto:**
   ```bash
   git add archivo-resuelto.tsx
   git commit -m "Resolver conflictos de merge"
   ```

## Checklist Pre-Merge

Antes de hacer merge, verifica:

- [ ] Todos los cambios están en la rama New-Features
- [ ] El proyecto compila sin errores (`pnpm build`)
- [ ] No hay errores de TypeScript
- [ ] Las pruebas pasan (si las hay)
- [ ] La documentación está actualizada
- [ ] Las variables de entorno están documentadas

## Después del Merge

1. **Actualizar rama local:**
   ```bash
   git checkout main
   git pull osoria main
   ```

2. **Eliminar rama (opcional):**
   ```bash
   git branch -d New-Features  # Local
   git push osoria --delete New-Features  # Remoto
   ```

3. **Crear nueva rama para futuros cambios:**
   ```bash
   git checkout -b nueva-feature
   ```

## Problemas Comunes

### Error: "Merge conflict"

**Solución:**
- Revisa los archivos con conflictos
- Resuelve manualmente
- Haz commit de los cambios resueltos

### Error: "Your branch is behind"

**Solución:**
```bash
git checkout main
git pull osoria main
git checkout New-Features
git merge main  # Trae cambios de main a New-Features
```

### Error: "Permission denied"

**Solución:**
- Verifica que tengas permisos de escritura en el repositorio
- Asegúrate de estar autenticado con la cuenta correcta

## Recomendaciones

1. **Siempre revisa los cambios** antes de hacer merge
2. **Haz merge en un entorno de prueba** primero si es posible
3. **Mantén la rama main estable** - solo merges de código probado
4. **Usa Pull Requests** para revisión de código
5. **Documenta cambios importantes** en los commits

## Estado Actual

Según el análisis:
- ✅ **54 archivos cambiados**
- ✅ **7733 líneas agregadas**
- ✅ **245 líneas eliminadas**
- ✅ **Sin conflictos aparentes** (las ramas divergen desde un punto común)

El merge debería ser limpio, pero siempre verifica antes de hacerlo.

