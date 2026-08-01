# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primario — el dueño de tienda sin perfil técnico.** Es quien elige Osoria y a quien el producto
tiene que resolverle la vida. Llega en dos momentos y el primero es el cuello de botella:

- **El arranque.** Acaba de recibir su acceso, nunca ha tenido una tienda en línea y está
  intentando dejarla presentable antes de enseñársela a nadie. Tiene tiempo, pero no criterio
  técnico: cada pantalla que no entienda es un abandono.
- **La operación diaria.** Ya vende y entra con una tarea puntual y urgente — corregir un precio,
  mirar un pedido, agotar un producto. Tiene criterio pero no tiene tiempo, y lo que necesita es no
  perderse.

**Segunda audiencia confirmada — el cliente final.** Compra en una tienda concreta y no sabe que
Osoria existe. No elige la plataforma, pero su experiencia *es* el producto que el dueño vende, así
que se diseña con el mismo cuidado aunque no sea quien decide.

**Tercer rol, operativo — el super admin de plataforma.** Aprovisiona y supervisa tiendas desde la
consola. Es un rol de operación, no una audiencia de diseño.

## Product Purpose

Osoria permite que una persona sin habilidades técnicas monte y opere su propio comercio en línea y
lo mantenga por su cuenta. Cada tienda vive en su propio subdominio, con su catálogo, su marca, sus
pedidos y su aspecto, gestionados desde una consola propia.

El éxito es que el dueño llegue solo hasta el final: que cree, configure, publique y opere su tienda
sin escribir código, sin esperar a un desarrollador y sin pedirle permiso a nadie.

## Positioning

La autogestión completa de gente sin habilidades técnicas. La personalización visual es el medio
—el dueño ajusta secciones y componentes de su tienda desde el editor, sin tocar código— pero la
posición real es la independencia: nadie tiene que intervenir entre el dueño y su tienda publicada.

## Operating Context

- Cada tienda se sirve en `<subdominio>.osoria.help`. La consola de plataforma vive en
  `admin.osoria.help`.
- El dueño trabaja desde la consola de su propia tienda, alojada bajo la ruta de administración de
  su subdominio.
- El ciclo de vida de una tienda tiene **dos banderas distintas que nunca deben confundirse**:
  `is_active` es la suspensión que decide la plataforma; `is_public` es la publicación que decide el
  dueño. Una tienda solo se sirve al público cuando ambas se cumplen.
- Una tienda recién creada nace sin publicar, de modo que el dueño puede configurarla entera antes
  de que exista para nadie.
- El alta de un dueño se hace hoy entregándole una contraseña temporal por fuera del producto, no
  mediante un correo de invitación.

## Capabilities and Constraints

**Confirmado**
- Catálogo por tienda: productos, variantes, categorías, imágenes, combos.
- Pedidos, con correo de confirmación al cliente.
- Editor visual por tienda: tema, tipografía, composición del home y configuración de la vitrina.
- Moneda: pesos colombianos (`COP`) por defecto, con moneda propia por tienda en el contrato de
  datos.
- Idioma de la interfaz: **español**. El sistema de traducción contempla `es | en | pt`, pero la
  copia enviada está en español y ese es el idioma del producto.

**Explícitamente sin decidir — no inventar**
- **Métodos de pago.** Aún no está confirmado cómo van a funcionar. Lo que existe hoy en el código
  es únicamente pago contra entrega, y eso es un estado de implementación, no el modelo elegido.
- **Costo de envío.** Pendiente de desarrollo. Hoy el campo existe pero siempre vale cero; no hay
  cálculo por zona.
- **Dominio propio por tienda.** La estructura actual de subdominios es correcta, pero algún cliente
  podría pedir traer su propio dominio. No está resuelto.
- **Monetización.** No existe ninguna facturación, plan ni suscripción en el producto. Cómo cobra
  Osoria a los dueños está sin decidir, y ningún trabajo futuro debe inventarse precios ni planes.

## Brand Commitments

- El nombre del producto es **Osoria**.
- **La plataforma es invisible para el cliente final.** Ninguna pantalla de cara al cliente lleva
  marca, nombre ni color de Osoria — pantallas de aviso y de error incluidas. El cliente compra en
  la tienda, no en la plataforma.
- La voz del producto es en español.

## Evidence on Hand

- Tiendas reales en producción: **Cumbre Dorada Café** (tienda demo sembrada por la plataforma) y
  **NiCoffe** (creada por el operador).
- **No existen clientes de referencia, testimonios, casos de éxito, cifras de uso ni métricas de
  negocio.** Ningún trabajo futuro puede fabricarlos ni insinuarlos.

## Product Principles

1. **El dueño llega solo hasta el final.** Cualquier paso que exija intervención técnica o soporte
   humano es un defecto del producto, no del usuario.
2. **Configurar antes de publicar.** Una tienda sin publicar es un espacio de trabajo completo, no
   una tienda rota: todo debe poder configurarse y previsualizarse antes de que exista para el
   público.
3. **La plataforma no se interpone.** Entre el cliente final y la tienda no aparece nunca la marca
   del anfitrión.
4. **Dos mundos, dos registros.** La consola es densa y de trabajo; la tienda es expresiva y del
   dueño. No se contaminan.
5. **Lo no decidido se declara.** Pagos, envíos, dominios propios y monetización están abiertos; se
   nombran como abiertos en lugar de rellenarse con supuestos.

## Accessibility & Inclusion

El usuario primario no tiene habilidades técnicas: el producto no puede dar por sabido ningún
concepto de desarrollo, ni exigir vocabulario técnico para completar una tarea. No hay un estándar
formal de accesibilidad establecido para este producto; la interfaz sí respeta un mínimo táctil de
44×44px en móvil.
