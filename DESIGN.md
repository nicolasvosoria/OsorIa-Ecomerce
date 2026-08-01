---
name: Osoria
description: Plataforma multi-tienda de e-commerce donde un solo contrato de tokens hospeda identidades visuales distintas por tienda.
colors:
  pizarra-serena: "#4a5568"
  agua-clara: "#5daba8"
  papel: "#ffffff"
  tinta: "#1a1a1a"
  superficie-tenue: "#f7fafc"
  tinta-tenue: "#718096"
  filete: "#e2e8f0"
  exito: "#16a34a"
  destructivo: "oklch(0.577 0.245 27.325)"
  consola-superficie: "#f7f8fa"
  consola-tinta: "#1f2328"
  consola-primary: "#4f46e5"
  consola-filete: "#d8dce2"
typography:
  display:
    fontFamily: "var(--font-family-heading), var(--font-geist-sans), sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "var(--font-family-heading), var(--font-geist-sans), sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "var(--font-family-heading), var(--font-geist-sans), sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "var(--font-family-sans), var(--font-geist-sans), sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "var(--font-family-sans), var(--font-geist-sans), sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "normal"
  mono:
    fontFamily: "var(--font-geist-mono), monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  micro:
    fontFamily: "var(--font-family-sans), var(--font-geist-sans), sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
rounded:
  none: "0px"
  sm: "0.25rem"
  md: "0.375rem"
  lg: "0.5rem"
  xl: "0.75rem"
  card: "1.5rem"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.pizarra-serena}"
    textColor: "{colors.papel}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "36px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.pizarra-serena}"
  button-outline:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.tinta-tenue}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "36px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  card:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "16px"
  console-button-primary:
    backgroundColor: "{colors.consola-primary}"
    textColor: "{colors.papel}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
    height: "36px"
---

# Design System: Osoria

## Overview

**Creative North Star: "La Casa de Muchas Casas"**

Osoria no es una tienda: es la estructura que hospeda muchas. Las proporciones, la mecánica de
los componentes y el vocabulario de superficies son siempre los mismos; lo que cambia es quién
los habita. Cada tienda elige un mundo visual y lo instala a través de variables CSS que el
runtime escribe sobre `<html>` — color, radio, densidad, sombra y tipografía — sin que ninguna
pantalla tenga que saber de qué tienda se trata. Quien diseñe algo nuevo aquí trabaja para
inquilinos que todavía no conoce: la disciplina no está en elegir bonito, está en no cerrarle la
puerta a ninguno.

De ahí nace la separación más importante del sistema. Hay dos mundos y no deben parecerse. El
**storefront** es de cara al cliente: es la tienda de su dueño, respira su marca, y está hecho
para que ese dueño pueda personalizar secciones y componentes con facilidad — el diseño es parte
del producto que se le vende. La **administración** es densa y de trabajo: tablas, formularios,
paneles, decisiones rápidas, y un chrome deliberadamente neutro que se blinda del tema de la
tienda para que el editor nunca mienta sobre lo que estás editando. Ese blindaje está en el
código, no en la intención: `.editor-chrome` redeclara cada token semántico, geométrico y de
sombra que el bootstrap del tema escribe en línea.

La profundidad se consigue por capas tonales, no por dramatismo: `background`, `card`, `muted` y
`popover` construyen la jerarquía, y la sombra —cuando existe— llega como token del mundo
elegido, nunca escrita a mano. Y hay una prohibición que atraviesa todo: la marca de la
plataforma no aparece jamás en una pantalla de cara al cliente. El cliente compra en NiCoffe, no
en Osoria.

**Key Characteristics:**
- Un contrato de tokens único, cinco mundos preset (Tech, Minimal, Suave, Bold, Boutique)
- Dos registros irreconciliables por diseño: storefront expresivo, administración densa y neutra
- Plano en reposo; la profundidad es tonal y la sombra la decide el preset
- Componentes sobrios y precisos: la personalidad entra por los tokens, nunca por adornos
- Geometría variable de 0px a píldora — ninguna pantalla puede asumir un radio concreto
- Español en toda la interfaz

## Colors

Una base fría y contenida que sostiene sin competir, pensada para que el color propio de cada
tienda tenga sitio donde aparecer.

### Primary
- **Pizarra Serena** (`#4a5568`): el gris azulado profundo que sostiene la interfaz. Fondo de los
  botones primarios y color del anillo de foco. Es el ancla de calma del storefront por defecto;
  cada tienda lo sustituye con el suyo sin tocar una línea de componente.

### Secondary
- **Agua Clara** (`#5daba8`): el verde azulado que señala. Sirve a la vez de `secondary` y de
  `accent`, así que aparece poco y siempre para marcar la acción o el estado que importa.

### Neutral
- **Papel** (`#ffffff`): superficie base y fondo de tarjetas y popovers.
- **Tinta** (`#1a1a1a`): texto principal. Casi negro, nunca negro puro.
- **Superficie Tenue** (`#f7fafc`): fondos secundarios y zonas apagadas donde el contenido descansa.
- **Tinta Tenue** (`#718096`): texto de apoyo, descripciones y etiquetas subordinadas.
- **Filete** (`#e2e8f0`): bordes y divisiones. Comparte valor con el borde de los campos, así que
  el formulario y el resto de la interfaz se dibujan con la misma línea.

### Tertiary
- **Éxito** (`#16a34a`): confirmaciones. Único color que no participa del sistema de temas.
- **Destructivo** (`oklch(0.577 0.245 27.325)`): errores y acciones irreversibles.

### La consola de administración
Palette aparte, y a propósito. **Consola Superficie** (`#f7f8fa`), **Consola Tinta** (`#1f2328`),
**Consola Primary** (`#4f46e5`) y **Consola Filete** (`#d8dce2`) viven bajo `.editor-chrome` y no
se ven afectadas por el tema de ninguna tienda.

### Named Rules

**La Regla de los Dos Mundos.** Ninguna pantalla mezcla los dos registros. Si la ruta es de
administración, hereda `.editor-chrome` y su paleta neutra; si es de cara al cliente, hereda el
tema de la tienda. Una pantalla que no sepa a cuál pertenece está mal ubicada, no mal pintada.

**La Regla del Anfitrión Invisible.** La marca de la plataforma no aparece nunca en una pantalla
de cara al cliente — ni logo, ni nombre, ni color corporativo. Incluye las pantallas de aviso y de
error: el visitante que llega a una tienda apagada tiene que ver *esa* tienda o nada, jamás otra.

**La Regla del Acento Escaso.** El accent señala una sola cosa por vista. Cuando dos elementos lo
reclaman, uno de los dos no era tan importante.

## Typography

**Display / Body Font:** Geist Sans, auto-hospedada vía `next/font/local` (con `sans-serif` de
respaldo)
**Mono Font:** Geist Mono (con `monospace` de respaldo)

**Character:** Geist es la voz por defecto, no la definitiva. Es neutra, moderna y de excelente
legibilidad en densidades altas, lo que la hace ideal para la administración. En el storefront
cada tienda puede instalar su propia pareja tipográfica —titular y cuerpo— que llega desde Google
Fonts y sustituye `--font-family-heading` y `--font-family-sans` en caliente. Por eso ninguna
pantalla debe apoyarse en las métricas concretas de Geist.

### Hierarchy
- **Display** (600, 1.875rem, 1.15): titulares de página en el storefront.
- **Headline** (600, 1.5rem, 1.2): cabeceras de sección y títulos de las tarjetas de aviso.
- **Title** (600, 1.125rem, 1): título de tarjeta, con `tracking-tight`.
- **Body** (400, 1rem, 1.5): texto corrido y valor de los campos. En pantallas medianas los campos
  bajan a 0.875rem para ganar densidad sin perder legibilidad táctil en móvil.
- **Label** (500, 0.875rem, 1.25): etiquetas de formulario, descripciones y texto de apoyo.
- **Mono** (400, 0.875rem): identificadores, números de pedido y valores técnicos.
- **Micro** (700, 0.625rem, 1): el contador numérico dentro de una insignia de ícono (carrito,
  wishlist), un círculo de 16px que no admite un dígito mayor. No es un tamaño para texto de
  lectura — su único uso es ese contador.

### Named Rules

**La Regla de la Voz Prestada.** El titular usa `font-heading`, nunca una familia literal. Un
componente que escriba el nombre de una fuente rompe la personalización de todas las tiendas menos
una.

## Layout

Rejilla fluida sobre contenedores centrados con `container mx-auto px-4`. El ritmo espacial se
ancla en una sola variable: `--spacing`, que resuelve a `calc(0.25rem * var(--density-scale, 1))`
y de la que cuelga *toda* utilidad de espaciado de Tailwind (`p-*`, `m-*`, `gap-*`, `size-*`). Esa
indirección es la que permite que un preset cambie la densidad de la interfaz entera con un solo
número: Minimal la expande a 1.14, Bold la comprime a 0.97, Suave y Boutique la aflojan levemente.

Los pasos que el sistema usa de verdad son 4, 8, 12, 16 y 24px. La administración vive a densidad
fija —`--spacing: 0.25rem` redeclarado en `.editor-chrome`— porque una consola que cambia de
densidad según la tienda que estás editando es una consola que no puedes aprender.

En móvil (hasta 768px) todo elemento pulsable —`button`, `[role="button"]`, `a[href]`— tiene un
mínimo forzado de 44×44px, con la única excepción de los iconos pequeños, que bajan a 36px.

### Named Rules

**La Regla del Ancla Única.** El espaciado sale siempre de las utilidades de Tailwind, nunca de
píxeles literales. Un `padding: 18px` escrito a mano se queda fuera del sistema de densidad y
delata la pantalla en cuanto una tienda elige Minimal.

## Elevation & Depth

El sistema construye profundidad con **capas tonales**, no con sombras. La jerarquía se lee en el
salto entre `background`, `card`, `muted` y `popover`, reforzado por el `filete` de 1px. En reposo
y por defecto, `--shadow-card` y `--shadow-elevated` valen `none`, y la administración las fija en
`none` de forma permanente.

La sombra existe, pero no como decisión de página: es una propiedad del mundo que la tienda eligió,
y llega exclusivamente por token. Los cinco presets la usan de maneras deliberadamente distintas —
desde el borde de 1px de Minimal hasta el desplazamiento duro y sin difuminar de Bold — y ninguna
de esas decisiones pertenece a la pantalla que se esté diseñando.

### Shadow Vocabulary
- **`--shadow-card`**: reposo de tarjetas y superficies de contenido. `none` por defecto.
- **`--shadow-elevated`**: superficies que flotan sobre el contenido — menús, popovers, hojas.
  `none` por defecto.
- **`shadow-xs`** (utilidad de Tailwind): el único uso directo y acotado, en botones y campos, para
  separarlos apenas del fondo.

### Named Rules

**La Regla de la Sombra Ajena.** Ninguna pantalla escribe un `box-shadow`. Usa `--shadow-card` o
`--shadow-elevated`, o no usa ninguno. Una sombra literal ignora el mundo de la tienda y rompe los
cinco presets a la vez.

## Shapes

La geometría es la dimensión más variable del sistema, y por eso la más peligrosa de asumir. El
radio base es `--radius`, `0.5rem` por defecto, del que se derivan cuatro escalones
(`sm` = base − 4px, `md` = base − 2px, `lg` = base, `xl` = base + 4px). Encima viven dos tokens de
forma independientes: `--button-radius` y `--card-radius`.

El recorrido real entre presets va de un extremo al otro: Minimal pone todo a `0px`; Bold usa un
`0.15rem` casi recto; Boutique redondea a `0.5rem` el botón y `0.9rem` la tarjeta; Suave y Tech
llevan el botón a píldora (`9999px`) con tarjetas de `1.25rem` y `1.5rem`. La utilidad
`rounded-card` existe precisamente para que las tarjetas de producto no fijen su propio radio.

Los bordes son de 1px y de un solo color (`filete`), lo que mantiene el dibujo de la interfaz
uniforme sea cual sea el radio.

### Named Rules

**La Regla del Radio Prestado.** Ningún componente decide su propio radio. Botones usan
`--button-radius`, tarjetas `rounded-card`, el resto la escala `rounded-*`. Un `rounded-full`
literal en una tienda Minimal es un error visible desde la primera pantalla.

## Components

Sobrios y precisos: hacen su trabajo con medidas exactas y estados claros, y dejan que la
personalidad entre por los tokens.

### Buttons
- **Shape:** radio del preset (`--button-radius`); alto fijo de 36px en tamaño por defecto, 28px en
  `sm` y 48px en `lg`.
- **Primary:** fondo `pizarra-serena` sobre texto `papel`, borde transparente, `shadow-xs`,
  padding 8px 12px, peso 600.
- **Hover / Focus:** el primario baja a 90% de opacidad de su fondo; el foco visible dibuja un
  anillo de 3px con el `ring` al 50%, más un borde del mismo color. Transición sobre todas las
  propiedades.
- **Outline:** fondo `papel` con borde de 1px; al hover pasa a la superficie `accent`.
- **Ghost:** sin fondo, texto al 50% de opacidad y peso 500; gana fondo `accent` al hover. Es la
  acción terciaria del sistema.
- **Secondary:** fondo translúcido al 10% con `backdrop-blur`. Reservado para botones sobre
  imagen o color pleno.
- **Link:** solo texto en color primario, con subrayado al hover.

### Cards / Containers
- **Corner Style:** `rounded-md` en la primitiva; las tarjetas de producto usan `rounded-card`
  para heredar el radio del preset.
- **Background:** `card` sobre `card-foreground`.
- **Shadow Strategy:** ninguna en reposo. Ver Elevation & Depth.
- **Internal Padding:** 16px en cabecera y contenido; el pie sube a 24px.
- **Estructura:** cabecera con título (peso 600, 1.125rem, `tracking-tight`) y descripción en
  `tinta-tenue` a 0.875rem.

### Inputs / Fields
- **Style:** fondo transparente, borde de 1px en `filete`, radio `md`, alto 36px, padding 4px 12px,
  `shadow-xs`. En modo oscuro el fondo pasa a `input` al 30%.
- **Focus:** el borde toma el color `ring` y se le suma un anillo de 3px al 50% de opacidad.
  Transición limitada a color y sombra.
- **Error:** `aria-invalid` tiñe el borde de `destructivo` y el anillo a su 20%.
- **Disabled:** opacidad 50% y cursor bloqueado.

### Navigation
- **Storefront:** cabecera con logo de la tienda, menú principal, buscador, carrito y acceso de
  cuenta. Se acompaña de un botón flotante de contacto. Todo ello es *chrome de tienda* y solo
  aparece en rutas de cara al cliente.
- **Administración:** shell con barra lateral que deriva su paleta de la propia consola —
  `--sidebar` y sus siete hermanos son alias de los tokens del chrome, no copias — de modo que
  sigue al modo claro/oscuro sin seguir jamás al tema de la tienda.
- **Consola de plataforma:** su propio caparazón sobrio, una topbar sobre `bg-muted/20`, sin nada
  del chrome de tienda.

### Signature: el chrome neutro del editor

`.editor-chrome` es el componente más característico del sistema y no es visible: es una frontera.
Redeclara toda la superficie de tokens con una plantilla neutra y se aplica tanto a la raíz del
shell como al contenido portaleado (Select, Popover, Tooltip, Dialog) que se renderiza dentro. Su
eje claro/oscuro sigue la clase `.dark` de la aplicación, la misma señal que usan las variantes
`dark:` de shadcn, así que el chrome y los controles de formulario que contiene nunca se
desincronizan. La vista previa del editor queda fuera de su alcance por construcción: vive en un
`<iframe>`, o sea otro documento.

## Do's and Don'ts

### Do:
- **Do** decidir primero a qué mundo pertenece la pantalla — cliente o administración — y heredar
  su chrome. Es la primera pregunta, no la última.
- **Do** sacar cada color de los tokens semánticos (`bg-primary`, `text-muted-foreground`,
  `border-border`). Son el único punto por el que entra la identidad de cada tienda.
- **Do** usar `--button-radius`, `rounded-card` y la escala `rounded-*` para toda geometría.
- **Do** dejar la profundidad en manos de las capas tonales, y la sombra en manos de
  `--shadow-card` / `--shadow-elevated`.
- **Do** mantener el español en toda la interfaz, incluidos estados vacíos y mensajes de error.
- **Do** respetar el mínimo táctil de 44×44px en móvil.
- **Do** probar cualquier pantalla nueva contra al menos dos presets opuestos — Minimal y Suave —
  antes de darla por buena. Si solo se ve bien en uno, no está terminada.

### Don't:
- **Don't** poner marca de la plataforma en ninguna pantalla de cara al cliente, incluidas las de
  aviso y error. El cliente compra en la tienda, no en Osoria.
- **Don't** dejar que una pantalla de cliente herede el aspecto denso de la administración, ni al
  revés. Son dos registros y la mezcla se nota de inmediato.
- **Don't** escribir colores literales, `box-shadow` a mano, píxeles de espaciado sueltos ni
  nombres de fuente en un componente.
- **Don't** asumir un radio concreto: el sistema va de `0px` a píldora según el preset.
- **Don't** caer en la plantilla genérica de e-commerce — carruseles de héroe con foto de banco,
  insignias apiladas de envío gratis, cuentas atrás falsas. Cinco identidades distintas dependen de
  que la estructura no traiga una estética propia.
- **Don't** modificar una primitiva de `components/ui/**` para resolver un problema de una sola
  pantalla: se comparten entre storefront y administración. Acótalo con un selector como ya hace
  `.editor-chrome`.
