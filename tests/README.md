# Tests de Creación de Cuentas

Este directorio contiene los tests para verificar que la funcionalidad de creación de cuentas nuevas esté funcionando correctamente.

## Estructura de Tests

```
tests/
├── setup.ts                          # Configuración global de tests
├── __mocks__/
│   └── supabase.ts                   # Mocks de Supabase
├── auth/
│   ├── signUp.test.ts                # Tests de la función signUp
│   └── auth-context.test.tsx         # Tests del contexto de autenticación
├── components/
│   └── register-form.test.tsx        # Tests del componente de registro
└── integration/
    └── registration-flow.test.ts     # Tests de integración del flujo completo
```

## Ejecutar Tests

### Ejecutar todos los tests
```bash
pnpm test
```

### Ejecutar tests en modo watch
```bash
pnpm test --watch
```

### Ejecutar tests con UI
```bash
pnpm test:ui
```

### Ejecutar tests con cobertura
```bash
pnpm test:coverage
```

### Ejecutar un archivo específico
```bash
pnpm test tests/auth/signUp.test.ts
```

## Cobertura de Tests

Los tests cubren:

1. **Función signUp (`signUp.test.ts`)**
   - Registro exitoso con todos los datos
   - Registro sin nombre y apellido
   - Manejo de errores de Supabase
   - Creación manual de perfil si el trigger falla
   - Detección de email de confirmación enviado
   - Manejo cuando Supabase no está configurado

2. **Contexto de Autenticación (`auth-context.test.tsx`)**
   - Proporcionar el contexto correctamente
   - Llamar a signUp cuando se usa register
   - Llamar a signIn cuando se usa login
   - Mostrar el usuario cuando está autenticado

3. **Componente de Registro (`register-form.test.tsx`)**
   - Mostrar el modal de registro
   - Validar que las contraseñas coincidan
   - Validar que todos los campos estén completos
   - Llamar a register con los datos correctos
   - Mostrar error cuando el registro falla
   - Limpiar los campos después de un registro exitoso

4. **Flujo de Integración (`registration-flow.test.ts`)**
   - Flujo completo de registro exitoso
   - Manejo de confirmación de email
   - Manejo de email duplicado
   - Manejo de contraseña débil
   - Creación manual de perfil si el trigger falla

## Mocking

Los tests utilizan mocks para:
- **Supabase Client**: Simula las respuestas de la API de Supabase
- **Next.js Router**: Simula la navegación
- **Next.js Image/Link**: Simula componentes de Next.js

## Notas

- Los tests están configurados para ejecutarse en un entorno `jsdom`
- Se requiere que las variables de entorno estén configuradas en `tests/setup.ts`
- Los mocks se reinician antes de cada test para evitar interferencias

