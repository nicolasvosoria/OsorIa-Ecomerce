# H6 Operational Readiness — ecommerce-saneamiento-secuencial

## Scope Guard

- This H6 artifact is **QA/evidence only**.
- It does **not** broaden H1/H2 behavior and does not introduce H3/H4/H5 domain changes.
- Prior evidence required as hard preconditions:
  - `.atl/ecommerce-saneamiento-secuencial/h1-security-evidence.md`
  - `.atl/ecommerce-saneamiento-secuencial/h2-quality-evidence.md`

## Operativo Definition

For this ecommerce lane, **operativo** means the platform can complete the minimum customer path with controlled risk and auditable evidence:

1. Store público resuelve y responde 200 con payload público minimizado.
2. Catálogo y detalle de producto son navegables para un usuario final.
3. Operaciones de carrito (agregar/actualizar/eliminar) reflejan estado consistente.
4. Checkout crea pedido sin interrumpir al cliente.
5. Respuesta de email nunca expone errores internos al cliente final.

## Critical-Flow Matrix

| Critical Flow                        | Automated Smoke Check                                                                                                                      | Manual Smoke Check                                                                      | Phase Gate Rule                                                                                    | Evidence Output                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Store discovery (/api/store)         | `npx vitest run -c tests/vitest.security.config.ts tests/security/store-contract.test.ts tests/security/api-routes-security.test.ts`       | Abrir storefront en navegador y validar branding + datos de tienda pública              | Debe estar verde sin regresiones de contrato (`200` válido, `400` inválido, sin columnas privadas) | Registro de comando + resultado en este H6 artifact            |
| Product visibility (catalog/detail)  | `npx vitest run -c tests/vitest.security.config.ts tests/security/html-sanitization.test.ts`                                               | Recorrer listado y PDP en navegador; validar contenido visible sin HTML inyectado       | Sanitización y render de contenido deben permanecer verdes                                         | Registro de comando + checklist manual                         |
| Cart mutation (add/update/remove)    | `npx vitest run -c tests/vitest.security.config.ts tests/quality/h6-cart-mutation-smoke.test.ts`                                           | Agregar producto, cambiar cantidad, remover y confirmar totales esperados               | Debe existir smoke automatizado de contrato de mutación + validación manual de UX end-to-end       | Resultado de comando + `.atl/.../h6-manual-smoke-checklist.md` |
| Checkout + order creation            | `npx vitest run -c tests/vitest.security.config.ts tests/security/order-email-contract.test.ts`                                            | Ejecutar compra E2E manual en entorno de prueba hasta confirmación de pedido            | Pedido creado sin error crítico para usuario                                                       | Evidencia manual + salida de comando                           |
| Confirmation email dispatch contract | `npx vitest run -c tests/vitest.security.config.ts tests/security/api-routes-security.test.ts tests/security/order-email-contract.test.ts` | Verificar mensaje de fallback amigable cuando falla SMTP, sin filtrado de error interno | Contrato debe permanecer sanitizado (`success: false` + `errorCode`, sin leak interno)             | Extracto JSON y log de prueba                                  |

## Manual vs Automated Classification

- **Automated checks**: verifican contratos no negociables (status codes, sanitización, payload público, invariantes de rutas).
- **Manual checks**: validan experiencia integrada del cliente en superficies no cubiertas por E2E automatizado en esta fase.
- Gate H6 se considera completo solo con ambas dimensiones: automatizado + manual.

## Gate Contract by Phase Boundary

### Pre-Phase Automated Gate

Objetivo: habilitar continuación de fases técnicas siguientes con evidencia reproducible en repositorio, sin bloquear por ejecución manual en esta etapa.

Condiciones obligatorias:

1. 100% de smoke checks automatizados del Critical-Flow Matrix en verde.
2. Evidencia de comando + resultado almacenada en este artifact (`H6 Current Phase-Gate Execution Log`).
3. Archivo repo-versioned de checklist manual presente: `.atl/ecommerce-saneamiento-secuencial/h6-manual-smoke-checklist.md` (puede estar en estado `PENDING`).

Resultado: con estas 3 condiciones, se permite **CONTINUE (phase work only)** para fases posteriores de implementación/verificación que no requieran sign-off manual final.

### Pre-Merge Manual Operational Gate

Objetivo: impedir merge/release sin validación funcional humana de storefront/cart/checkout.

Condiciones obligatorias:

1. Checklist manual repo-versioned en estado `PASS`, con fecha, entorno y responsable QA.
2. Sin blockers manuales abiertos en discovery/cart/checkout.
3. Trazabilidad a evidencia automatizada usada como precondición.

Resultado: sólo con este gate en `PASS` se habilita merge/release del cambio.

## Continuation Decision Rules

### CONTINUE to next phase only when ALL conditions hold

1. 100% automated smoke checks green.
2. No regression against H1/H2 accepted contracts.
3. Repo-versioned QA evidence está adjunta y trazable (incluyendo checklist manual en `PENDING` o `PASS`).
4. Se respeta el boundary: solo **phase work** hasta completar gate manual pre-merge.

### STOP / DO NOT CONTINUE when ANY condition occurs

1. Falla cualquier automated smoke check de flujo crítico.
2. No existe evidencia repo-versioned (`h6-manual-smoke-checklist.md`) para seguimiento manual.
3. Se detecta exposición de error interno en respuesta al cliente.
4. Evidencia incompleta o no reproducible.
5. Se intenta merge/release con checklist manual en `PENDING` o `FAIL`.

## H6 Current Phase-Gate Execution Log

### Automated smoke execution (this batch)

1. `npx vitest run -c tests/vitest.security.config.ts tests/quality/h6-operational-readiness.test.ts`
   - ✅ 1 file, 6 tests passed.
2. `npx vitest run -c tests/vitest.security.config.ts tests/quality/h6-cart-mutation-smoke.test.ts`
   - ✅ 1 file, 2 tests passed.
3. `npx vitest run -c tests/vitest.security.config.ts tests/security/store-contract.test.ts tests/security/html-sanitization.test.ts tests/security/order-email-contract.test.ts tests/security/api-routes-security.test.ts tests/quality/h2-quality-gates.test.ts tests/quality/h6-operational-readiness.test.ts tests/quality/h6-cart-mutation-smoke.test.ts`
   - ✅ 7 files, 24 tests passed.

### Manual smoke execution status (this batch)

- 🔲 Not executed in this terminal-only batch.
- Checklist file created in repo (`h6-manual-smoke-checklist.md`) with status `PENDING` for explicit tracking.
- Requirement remains: manual walkthrough for catalog/detail/cart/checkout UX before merge/release.

### Phase-gate decision for this batch

- **Automated dimension**: PASS.
- **Manual dimension**: PENDING.
- **Decision**: **CONDITIONAL CONTINUE (phase work only)** with repo-versioned QA evidence.
- **Pre-merge decision**: **STOP** until manual checklist transitions from `PENDING` to `PASS`.
