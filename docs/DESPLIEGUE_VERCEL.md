# Guía de Despliegue en Vercel

## Pasos para Desplegar el Proyecto

### 1. Preparar el Repositorio

Asegúrate de que todos los cambios estén en GitHub:

```bash
git add .
git commit -m "Preparar para despliegue en Vercel"
git push osoria New-Features
```

### 2. Crear Cuenta en Vercel (si no tienes)

1. Ve a [vercel.com](https://vercel.com)
2. Haz clic en **Sign Up**
3. Inicia sesión con tu cuenta de GitHub (`nicolasvosoria`)

### 3. Importar el Proyecto

1. En el dashboard de Vercel, haz clic en **Add New...** → **Project**
2. Selecciona **Import Git Repository**
3. Busca y selecciona: `nicolasvosoria/OsorIa-Ecomerce`
4. Haz clic en **Import**

### 4. Configurar el Proyecto

Vercel detectará automáticamente que es un proyecto Next.js. Configura:

#### Framework Preset:
- **Framework Preset:** Next.js (debería detectarse automáticamente)

#### Root Directory:
- Deja en blanco (raíz del proyecto)

#### Build and Output Settings:
- **Build Command:** `pnpm build` (o `npm run build` si usas npm)
- **Output Directory:** `.next` (automático para Next.js)
- **Install Command:** `pnpm install` (o `npm install`)

### 5. Configurar Variables de Entorno (CRÍTICO)

Antes de hacer el deploy, configura estas variables en Vercel:

#### Variables Requeridas:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Valor: Tu URL de Supabase (ej: `https://qwwwnrjjmxpwppgipsug.supabase.co`)
   - Tipo: Plain (texto plano)

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Valor: Tu clave anónima de Supabase
   - Tipo: Plain (texto plano)

#### Variables Opcionales:

3. **NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN** (si usas Shopify)
   - Valor: Tu dominio de Shopify
   - Tipo: Plain

#### Cómo Agregar Variables:

1. En la página de configuración del proyecto, ve a la sección **Environment Variables**
2. Haz clic en **Add New**
3. Agrega cada variable:
   - **Name:** `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** Tu valor
   - **Environment:** Selecciona todas (Production, Preview, Development)
4. Repite para cada variable
5. Haz clic en **Save**

### 6. Configurar URLs de Redirección en Supabase

**IMPORTANTE:** Antes del despliegue, configura las URLs de redirección en Supabase:

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **URL Configuration**
4. En **Redirect URLs**, agrega:
   - `https://tu-proyecto.vercel.app/auth/reset-password`
   - `https://tu-proyecto.vercel.app/auth/callback`
   - (Reemplaza `tu-proyecto` con el nombre que Vercel asigne)

### 7. Hacer el Deploy

1. Haz clic en **Deploy**
2. Espera a que Vercel construya el proyecto (puede tomar 2-5 minutos)
3. Revisa los logs si hay errores

### 8. Verificar el Deploy

Una vez completado:

1. Vercel te dará una URL: `https://tu-proyecto.vercel.app`
2. Visita la URL y verifica que todo funcione
3. Prueba:
   - Login/Registro
   - Recuperación de contraseña
   - Navegación
   - Carrito de compras

## Configuración Adicional

### Dominio Personalizado (Opcional)

1. En el dashboard de Vercel, ve a **Settings** → **Domains**
2. Agrega tu dominio personalizado
3. Sigue las instrucciones para configurar DNS

### Variables de Entorno por Ambiente

Puedes configurar variables diferentes para:
- **Production:** Producción
- **Preview:** Pull requests y branches
- **Development:** Desarrollo local

### Actualizar Variables de Entorno

Si necesitas cambiar variables después del deploy:

1. Ve a **Settings** → **Environment Variables**
2. Edita o agrega variables
3. Haz un nuevo deploy o espera al siguiente push

## Solución de Problemas

### Error: "Environment variables not found"

**Solución:**
- Verifica que todas las variables estén configuradas en Vercel
- Asegúrate de que los nombres sean exactos (case-sensitive)
- Verifica que estén habilitadas para el ambiente correcto

### Error: "Build failed"

**Solución:**
1. Revisa los logs de build en Vercel
2. Verifica que `package.json` tenga todos los scripts necesarios
3. Asegúrate de que todas las dependencias estén en `package.json`

### Error: "Supabase connection failed"

**Solución:**
- Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén configuradas
- Verifica que las URLs de redirección estén en Supabase Dashboard
- Revisa los logs del navegador para ver errores específicos

### Error: "Invalid redirect URL" en recuperación de contraseña

**Solución:**
- Agrega la URL de producción de Vercel en Supabase Dashboard
- Formato: `https://tu-proyecto.vercel.app/auth/reset-password`

## Checklist Pre-Deploy

Antes de hacer el deploy, verifica:

- [ ] Todos los cambios están en GitHub
- [ ] Variables de entorno configuradas en Vercel
- [ ] URLs de redirección configuradas en Supabase
- [ ] `package.json` tiene el script `build`
- [ ] No hay errores de TypeScript o ESLint críticos
- [ ] El proyecto funciona correctamente en local

## Comandos Útiles

### Verificar build localmente antes de deploy:

```bash
pnpm build
pnpm start
```

### Ver logs de Vercel:

1. Ve al dashboard de Vercel
2. Selecciona tu proyecto
3. Ve a **Deployments**
4. Haz clic en el deployment
5. Revisa los logs de build y runtime

## Actualizar el Proyecto

Cada vez que hagas push a GitHub:

1. Vercel detectará automáticamente los cambios
2. Creará un nuevo deployment
3. Si está en la rama principal, desplegará a producción
4. Si es otra rama, creará un preview deployment

## Notas Importantes

- **Variables de entorno:** Las variables que empiezan con `NEXT_PUBLIC_` son accesibles en el cliente
- **Secrets:** No uses variables sensibles con `NEXT_PUBLIC_` (se exponen al cliente)
- **Build time:** El primer build puede tardar más (descarga de dependencias)
- **Cache:** Vercel cachea builds, los siguientes serán más rápidos

## Soporte

Si tienes problemas:
1. Revisa los logs en Vercel Dashboard
2. Verifica la documentación de Vercel: [vercel.com/docs](https://vercel.com/docs)
3. Revisa los logs del navegador en producción

