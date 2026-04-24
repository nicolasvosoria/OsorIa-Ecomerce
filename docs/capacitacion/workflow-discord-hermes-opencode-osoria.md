# Manual interno de capacitación: workflow Discord + Hermes + OpenCode en OSORIA

## Resumen ejecutivo

Este documento explica, de punta a punta, cómo trabaja hoy OSORIA cuando una idea, una necesidad del negocio o un reporte de problema llega al equipo y termina en una solución concreta en el producto. El objetivo es que cualquier persona del equipo —aunque no programe todos los días— pueda entender qué pasa, quién hace qué, qué puede pedir, qué no conviene asumir y cómo colaborar mejor.

La base del workflow actual combina:

- **Discord** como canal principal de coordinación y pedido.
- **Hermes** como capa operativa para gestionar y ejecutar flujos asistidos.
- **OpenCode** como entorno de ejecución para trabajo técnico asistido.
- **agents**, **skills** y **MCPs** como piezas que organizan cómo se investiga, se diseña, se implementa y se valida.

La idea central es simple: **la IA acelera, el equipo humano decide**. No se terceriza el criterio. No se delega la responsabilidad del negocio. No se “aprieta un botón y listo”. El sistema permite producir más rápido y con mejor trazabilidad, pero siempre con conducción humana.

También es clave ser honestos con el estado actual: hay capacidades fuertes (velocidad para documentar, estructurar, proponer, ejecutar tareas repetitivas y revisar consistencia) y hay limitaciones reales (dependencia de buen contexto, riesgo de interpretaciones incorrectas, necesidad de validación humana constante, y límites en acceso o visibilidad según permisos y herramientas).

Si te quedás con una sola idea de este manual, que sea esta: **pedidos claros + contexto suficiente + validación humana = resultados útiles y confiables**.

---

## Para quién es este documento

Este manual está pensado para:

- Personas nuevas en OSORIA que necesitan entender rápido cómo se organiza el trabajo con IA.
- Equipos de negocio, operaciones, producto, soporte y marketing que interactúan con equipos técnicos.
- Perfiles técnicos (desarrollo, QA, arquitectura) que necesitan una guía común para alinear expectativas con perfiles no técnicos.
- Líderes que priorizan trabajo y necesitan saber cómo pedir mejor y cómo leer resultados.

No está escrito como documentación académica ni como manual de comandos. Es una guía práctica de trabajo real en OSORIA.

---

## Visión general del workflow actual de OSORIA

En términos simples, el flujo actual puede verse así:

1. **Aparece una necesidad** (idea, bug, mejora, cambio operativo, deuda técnica, oportunidad).
2. **Se comunica por Discord** con contexto y objetivo.
3. **Hermes organiza el pedido** y habilita la ejecución asistida.
4. **OpenCode ejecuta trabajo técnico** mediante agentes especializados y skills aplicables.
5. Se producen artefactos intermedios (por ejemplo: análisis, propuesta, definición tipo **PRD**, plan técnico, tareas).
6. Se implementa, verifica y prepara un **PR** para revisión humana.
7. El equipo valida, corrige si hace falta y decide el merge.

Esto significa que no se “salta” la ingeniería: se estructura mejor. Los pasos de descubrimiento, diseño e implementación siguen existiendo, pero con más apoyo operativo.

---

## Qué es un LLM (sin humo)

Un **LLM** (Large Language Model) es un modelo de lenguaje entrenado para procesar texto y generar respuestas útiles. En nuestro contexto, sirve para:

- resumir información,
- proponer estructuras de documentación,
- transformar requerimientos en tareas,
- redactar código o documentación,
- revisar consistencia entre lo pedido y lo entregado.

Lo que **sí** hace bien: acelerar trabajo textual, proponer opciones, mantener formato, ejecutar instrucciones bien definidas.

Lo que **no** hace por sí solo: entender perfectamente el negocio sin contexto, asumir políticas internas no escritas, garantizar que todo lo técnico sea correcto al 100%, ni reemplazar decisión humana.

En OSORIA el LLM es una herramienta de productividad, no un reemplazo del equipo.

---

## Hermes: para qué lo usamos

En el workflow actual, **Hermes** funciona como capa de coordinación para trabajo asistido. Su valor principal está en:

- ordenar cómo se recibe un pedido,
- enrutar tareas al flujo correcto,
- mantener consistencia de proceso,
- facilitar seguimiento.

Hermes no es “magia”. Si el input es ambiguo, la salida tiende a ser ambigua. Si el pedido viene claro, la calidad sube fuerte. Por eso este manual insiste en calidad de pedido y validación.

---

## Discord: canal operativo y de colaboración

**Discord** es el punto de entrada más visible para el equipo. Ahí se coordinan solicitudes, dudas y seguimiento. La ventaja es la velocidad de comunicación. El riesgo, si se usa mal, es perder contexto entre mensajes sueltos.

Buenas prácticas básicas en Discord:

- Un pedido por hilo o mensaje claramente delimitado.
- Contexto mínimo obligatorio (qué pasa, a quién afecta, prioridad, evidencia).
- Evitar “haceme esto rápido” sin objetivo ni criterio de aceptación.
- No mezclar tres temas distintos en un solo pedido.

Discord funciona excelente cuando lo usamos para **coordinar**; no para improvisar especificaciones críticas sin contexto.

---

## Qué son agents, skills y MCPs

### Agents

Los **agents** son ejecutores especializados en tareas concretas dentro del flujo. No son personas. Son unidades de trabajo asistido que operan según instrucciones, alcance y herramientas disponibles.

Ejemplos de rol (conceptual):

- investigar contexto,
- redactar propuesta,
- estructurar tareas,
- implementar cambios,
- verificar cobertura o consistencia.

Cada agent rinde mejor cuando tiene objetivo claro y límites definidos.

### Skills

Las **skills** son “manuales operativos” reutilizables que le dicen al sistema cómo actuar en un tipo de tarea. Aportan consistencia: mismo tipo de problema, mismo enfoque base.

Ejemplos de impacto de una skill:

- orden de pasos recomendado,
- criterios de calidad,
- formato de salida esperado,
- restricciones (qué no tocar, qué validar antes de cerrar).

Sin skills, cada ejecución puede variar demasiado. Con skills, el equipo gana previsibilidad.

### MCPs

Los **MCPs** (Model Context Protocol servers/conectores de contexto y herramientas) permiten que el flujo asistido consulte o use capacidades externas de forma controlada (por ejemplo, documentación, estado de servicios, operaciones específicas, etc.).

Punto clave: MCP no significa acceso ilimitado. Cada integración tiene alcance y permisos. El equipo debe asumir que:

- puede haber herramientas disponibles en un entorno y no en otro,
- puede faltar contexto si una integración no expone cierto dato,
- hay límites de seguridad y gobernanza que no se deben saltear.

---

## Qué es OpenCode dentro de este flujo

**OpenCode** es el entorno donde se ejecuta trabajo técnico asistido con agentes y herramientas. Es donde se materializa gran parte de la implementación operativa: lectura de contexto, edición de archivos permitidos, validaciones y preparación de entregables.

Desde afuera, podés pensarlo así:

- Discord coordina,
- Hermes estructura y canaliza,
- OpenCode ejecuta tareas técnicas,
- el equipo humano evalúa y aprueba.

---

## Cómo se combinan desde idea/reporte hasta PRD, implementación y PR

Esta sección muestra el recorrido completo, en lenguaje práctico.

### 1) Entrada: idea, problema o pedido

Alguien detecta algo:

- “el checkout confunde”,
- “se rompió X en móvil”,
- “necesitamos nueva promo”,
- “hay que documentar proceso interno”.

Se pide por Discord con contexto.

### 2) Clarificación inicial

Antes de ejecutar, se despejan dudas:

- alcance,
- impacto,
- urgencia,
- criterio de éxito.

Si este paso se saltea, se paga después con retrabajo.

### 3) Estructura de producto/documentación (PRD u otro artefacto)

Cuando aplica, se arma un documento tipo **PRD** (Product Requirements Document) o equivalente interno con:

- problema,
- objetivo,
- alcance y fuera de alcance,
- criterios de aceptación,
- riesgos.

No siempre hace falta un PRD largo, pero sí una definición mínima explícita.

### 4) Diseño y desglose de tareas

Se transforma la necesidad en tareas concretas. Idealmente:

- pequeñas,
- verificables,
- ordenadas por dependencia.

Acá agents + skills ayudan a convertir “quiero X” en plan ejecutable.

### 5) Implementación asistida

OpenCode ejecuta cambios dentro del alcance autorizado:

- documentación,
- código,
- ajustes puntuales,
- validaciones permitidas.

El valor está en velocidad con estructura, no en hacer “cualquier cosa rápida”.

### 6) Validación técnica y funcional

Antes de cerrar:

- se revisa consistencia,
- se verifica contra criterios acordados,
- se corrigen desvíos.

### 7) Cierre en PR

Se prepara un **PR** claro para revisión humana:

- qué se cambió,
- por qué,
- evidencias,
- riesgos conocidos.

El merge es una decisión humana, no automática.

---

## Qué puede pedir el equipo

El equipo puede pedir, entre otras cosas:

- investigación inicial sobre un tema,
- síntesis de contexto disperso,
- propuesta de estructura para un PRD,
- redacción o mejora de documentación interna,
- desglose de requerimientos en tareas,
- implementación acotada en alcance permitido,
- soporte para preparar un PR claro,
- revisión de consistencia entre pedido y resultado.

En pocas palabras: se puede pedir ayuda para pensar, estructurar, ejecutar y comunicar mejor.

---

## Qué NO debe asumir el equipo

No hay que asumir que el sistema:

- entiende el negocio sin explicaciones,
- conoce decisiones históricas no documentadas,
- tiene acceso a todo,
- va a inferir prioridad real si no se la damos,
- puede aprobarse a sí mismo sin control humano,
- siempre acierta si el pedido es vago.

Tampoco hay que asumir automatizaciones no confirmadas. Si una capacidad no está validada en el entorno actual, **se trata como no disponible**.

---

## Capacidades actuales y limitaciones reales

### Capacidades actuales (hoy)

- Velocidad para producir borradores útiles de documentación.
- Capacidad de ordenar pedidos y transformarlos en pasos concretos.
- Buena performance en tareas repetitivas y de formato.
- Soporte para mantener consistencia en entregables.
- Aceleración en ciclos de análisis → ejecución → revisión.

### Limitaciones reales (hoy)

- Dependencia fuerte de la calidad del contexto de entrada.
- Riesgo de interpretar mal términos del negocio si no se explican.
- Posibles alucinaciones o supuestos incorrectos si falta información.
- Cobertura de herramientas condicionada por permisos e integraciones activas.
- Necesidad permanente de revisión humana antes de decisiones críticas.

Conclusión operativa: **capaz no significa autónomo**. El equipo gana productividad, pero no delega responsabilidad.

---

## Buenas prácticas para pedir trabajo por Discord

Si querés resultados buenos, pedí bien. Este formato simple funciona:

1. **Contexto**: qué está pasando y por qué importa.
2. **Objetivo**: qué resultado querés obtener.
3. **Alcance**: qué sí / qué no.
4. **Prioridad**: alta, media, baja + fecha si aplica.
5. **Criterio de aceptación**: cómo sabemos que está bien.
6. **Evidencia**: links, capturas, ejemplos.

Plantilla sugerida:

> Contexto: …
>
> Objetivo: …
>
> Alcance (incluye/excluye): …
>
> Prioridad: …
>
> Aceptación: …
>
> Evidencia: …

Regla de oro: si otra persona no puede entender tu pedido en 60 segundos, le falta claridad.

---

## Ejemplos prácticos de solicitudes buenas y flojas/mejorables

### Ejemplo 1 — Flojo

“Che, arreglen urgente lo de pagos que anda mal.”

Problemas:

- no dice qué falla,
- no dice a quién afecta,
- no hay evidencia,
- “urgente” sin criterio.

### Ejemplo 1 — Mejorable

“En checkout, algunos usuarios no pueden completar tarjeta en móvil. Pasa desde hoy a las 10:30. Impacta ventas. Prioridad alta. Necesito diagnóstico inicial y propuesta de corrección.”

Mejor, pero todavía falta:

- criterio de éxito,
- evidencia específica.

### Ejemplo 1 — Bueno

“Contexto: desde hoy 10:30 detectamos caída en conversiones mobile. Soporte reporta error al pagar con tarjeta en checkout.

Objetivo: identificar causa probable y proponer corrección de menor riesgo hoy mismo.

Alcance: incluir diagnóstico + propuesta + pasos de validación. Excluir rediseño completo de checkout.

Prioridad: alta (hoy).

Aprobación: considerar resuelto si se recupera flujo de pago en mobile y QA confirma caso principal.

Evidencia: capturas adjuntas + ticket #123 + métricas de caída.”

Esto sí habilita ejecución útil.

### Ejemplo 2 — Flojo

“Necesito un PRD para mejorar la tienda.”

Demasiado amplio. “Mejorar la tienda” puede ser cien cosas.

### Ejemplo 2 — Bueno

“Necesito un PRD breve para optimizar descubrimiento de productos en home. Problema: usuarios no encuentran categorías rápido. Objetivo: subir CTR en bloques de categorías. Alcance: cambios de contenido y layout liviano en home; fuera de alcance: nuevo buscador. Éxito: +X% CTR en 30 días.”

Acá ya hay foco.

### Ejemplo 3 — Flojo

“Hacé la documentación completa del sistema.”

Sin prioridad, sin alcance, sin definición de “completa”.

### Ejemplo 3 — Bueno

“Crear manual de onboarding interno para flujo Discord + Hermes + OpenCode orientado a perfiles no técnicos. Debe incluir glosario, límites reales, ejemplos de pedidos y checklist para ingresos nuevos. Tono directo y sin jerga innecesaria.”

Especifica audiencia y contenido esperado.

---

## Responsabilidades humanas (no negociables)

Aunque usemos IA y automatización asistida, hay responsabilidades que son 100% humanas:

1. **Priorizar trabajo** según impacto real de negocio.
2. **Definir objetivos y aceptación** de forma clara.
3. **Revisar resultados** antes de validar entrega.
4. **Tomar decisiones de riesgo** (producto, seguridad, cumplimiento).
5. **Mantener contexto actualizado** para evitar errores repetidos.
6. **Escalar cuando falta información** en vez de adivinar.

La regla es clara: la herramienta propone y acelera; la responsabilidad final es del equipo.

---

## Glosario rápido

- **LLM**: modelo de lenguaje que asiste con generación y análisis de texto.
- **Hermes**: capa de coordinación operativa para flujo asistido.
- **Discord**: canal principal de comunicación y pedido interno.
- **Agent / agents**: ejecutor asistido especializado en un tipo de tarea.
- **Skill / skills**: guía operativa reusable que define cómo resolver una clase de tareas.
- **MCP / MCPs**: conectores/protocolos para acceder a contexto y herramientas externas de forma controlada.
- **OpenCode**: entorno operativo donde se ejecutan tareas técnicas asistidas.
- **PRD**: documento de requerimientos de producto (problema, objetivo, alcance, aceptación).
- **PR**: pull request para revisión humana antes de integrar cambios.
- **Capacidades**: cosas que el flujo puede hacer bien hoy.
- **Limitaciones**: fronteras reales, riesgos o restricciones actuales del sistema.

---

## Checklist rápido para nuevos integrantes

Usá este checklist en tu primera semana para no perder tiempo:

### Entendimiento base

- [ ] Entiendo el rol de Discord, Hermes y OpenCode en el flujo.
- [ ] Entiendo qué es un LLM y qué no debería esperar de él.
- [ ] Sé diferenciar agents, skills y MCPs.

### Cómo pedir trabajo

- [ ] Puedo redactar un pedido con contexto, objetivo, alcance y aceptación.
- [ ] Evito pedidos ambiguos o sin evidencia.
- [ ] Sé marcar prioridad real (no todo es urgente).

### Cómo evaluar resultados

- [ ] Reviso si la entrega responde exactamente al objetivo planteado.
- [ ] Confirmo que no se asumieron cosas no pedidas.
- [ ] Verifico riesgos y límites antes de aprobar.

### Cultura de trabajo

- [ ] Tengo claro que la responsabilidad final es humana.
- [ ] Pido aclaración cuando falta contexto, en lugar de improvisar.
- [ ] Documento decisiones importantes para que el equipo no dependa de memoria informal.

---

## Recomendaciones finales (operativas y culturales)

1. **Pedí con precisión**: la calidad de salida depende mucho de la calidad de entrada.
2. **No romantices la automatización**: sirve, acelera, pero no reemplaza criterio.
3. **Validá siempre**: especialmente en cambios que impactan negocio o experiencia de cliente.
4. **Documentá decisiones**: lo no documentado se pierde y vuelve como retrabajo.
5. **Usá lenguaje concreto**: menos adjetivo, más hechos, ejemplos y criterios.

Una organización madura no es la que “usa más IA”, sino la que **la integra con disciplina**. Ese es el estándar que buscamos sostener en OSORIA.
