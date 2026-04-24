# Manual interno de capacitación: workflow Discord + Hermes + OpenCode en OSORIA

## Resumen ejecutivo

Este manual explica cómo trabaja OSORIA cuando una necesidad de negocio, un bug, una mejora operativa o una solicitud de documentación entra por Discord y termina en un resultado revisable por personas. La meta no es solamente “hacer cosas más rápido”; la meta es **trabajar con más claridad, más trazabilidad y menos retrabajo**.

El flujo actual combina:

- **Discord** como punto de coordinación diaria.
- **Hermes** como capa que ordena pedidos y su seguimiento.
- **OpenCode** como entorno de ejecución técnica asistida.
- **LLM**, **agents**, **skills** y **MCP** como piezas que ayudan a investigar, estructurar, ejecutar y verificar.

La idea central es simple y no negociable: **la IA acelera, el equipo humano decide**. En OSORIA no se delega criterio de negocio a una herramienta. No se aprueba por fe. No se “asume que si suena prolijo está bien”.

Si te tenés que llevar una sola frase de este documento, llevate esta: **pedido claro + contexto real + validación humana = resultado útil**.

---

## Para quién es este manual

Este documento está escrito para:

- personas nuevas en OSORIA que necesitan entender rápido cómo se trabaja;
- perfiles no técnicos (operaciones, comercial, soporte, administración, producto, contenido);
- perfiles técnicos que necesitan un lenguaje común con negocio;
- líderes que priorizan pedidos y deben leer avances sin perder tiempo.

No es un manual de comandos ni una guía para especialistas de infraestructura. Es una guía de trabajo real para coordinación interna.

---

## Objetivo del workflow

El workflow existe para resolver tres problemas clásicos:

1. pedidos ambiguos que generan respuestas ambiguas;
2. falta de criterios de aceptación, que termina en discusiones de “esto era lo que pedía / no, no era”;
3. poca visibilidad entre áreas cuando una iniciativa avanza.

Con este esquema buscamos:

- transformar pedidos en trabajo ejecutable;
- mantener evidencia del porqué y del qué;
- habilitar revisión humana efectiva antes de cualquier decisión sensible;
- cuidar límites de producción, merge y despliegue.

---

## Mapa general: del pedido al resultado

En forma resumida, el recorrido se ve así:

1. alguien detecta una necesidad;
2. se formula el pedido en Discord;
3. Hermes ayuda a estructurarlo y encaminarlo;
4. OpenCode ejecuta análisis, documentación o implementación en alcance permitido;
5. se generan artefactos (por ejemplo PRD, desglose de tareas, propuesta, PR);
6. personas revisan, validan y deciden próximos pasos.

Lo importante: **el flujo organiza la conversación para que la ejecución tenga menos fricción**. No reemplaza el juicio del equipo.

---

## Modelo mental del flujo de información

## Una analogía simple: posta de relevos

Pensalo como una carrera de relevos. El pedido es el testigo. Cada etapa lo toma, agrega claridad y lo pasa a la siguiente:

- quien reporta aporta contexto inicial;
- Hermes ordena la forma del pedido;
- OpenCode trabaja sobre lo pedido y devuelve entregables;
- reviewers humanos validan calidad y decisiones.

Si el testigo se pasa mal (pedido incompleto), toda la carrera se desordena. Por eso el énfasis en contexto y criterios.

## Qué se “mueve” dentro del sistema

No se mueve magia, se mueve información:

- descripción del problema o necesidad;
- objetivo de negocio;
- alcance y límites;
- evidencia disponible;
- criterios de aceptación;
- estado de avance;
- riesgos y decisiones pendientes.

Cuando uno de esos bloques falta, sube la probabilidad de malentendidos.

## Dónde se pierde calidad normalmente

En experiencias internas, la calidad baja por cuatro motivos repetidos:

1. pedido inicial vago (“arreglar urgente” sin evidencia);
2. mezcla de temas distintos en un mismo hilo;
3. cambios de alcance sin dejarlo explícito;
4. validación final superficial (“se ve bien” en lugar de “cumple criterio X”).

Este manual está diseñado para evitar exactamente esos cuatro errores.

---

## LLM: qué es, qué aporta y qué no aporta

## Qué es un LLM

Un **LLM** es un modelo de lenguaje que procesa texto y genera respuestas útiles según instrucciones y contexto. En OSORIA se usa para acelerar tareas de análisis, escritura estructurada y apoyo de ejecución.

## Qué aporta en la práctica

En el día a día aporta valor cuando necesitamos:

- resumir información dispersa;
- transformar una necesidad en checklist;
- redactar documentación con estructura consistente;
- proponer opciones con trade-offs;
- revisar coherencia entre pedido, avance y entrega final.

## Qué no hay que esperar

No hay que esperar que:

- adivine reglas de negocio no explicadas;
- recuerde decisiones históricas no documentadas;
- sustituya aprobación humana;
- garantice precisión perfecta sin validación.

La regla sana es: **si el tema impacta clientes, dinero, cumplimiento o reputación, siempre se valida con criterio humano explícito**.

---

## Hermes: rol operativo real

## Para qué sirve Hermes

**Hermes** cumple un rol de orden. Ayuda a que el pedido no quede en conversación informal eterna y pase a formato de trabajo trazable.

Su valor principal está en:

- ordenar entrada de pedidos;
- mantener consistencia del flujo;
- facilitar seguimiento de estados;
- reducir pérdida de contexto.

## Qué no hace Hermes

Hermes no “aprueba negocio”, no reemplaza owner del proceso y no vuelve correcto un pedido que nació confuso. Si el pedido llega débil, Hermes puede mejorar forma, pero no inventa verdad de negocio.

---

## Discord: canal de coordinación, no de adivinación

## Uso correcto de Discord

Discord funciona excelente cuando se usa para:

- abrir pedidos con formato claro;
- preguntar aclaraciones;
- registrar decisiones operativas;
- compartir evidencia relevante.

## Riesgos de uso desordenado

Discord pierde efectividad cuando:

- un mismo hilo mezcla bug, mejora y consulta administrativa;
- se piden cambios sin contexto ni alcance;
- se asume que “urgente” reemplaza prioridad razonada;
- no se deja rastro de decisiones.

## Norma práctica

Una conversación útil permite que una tercera persona, que recién entra, entienda en dos minutos:

- qué pasó,
- qué se pidió,
- qué se validó,
- qué falta.

Si eso no ocurre, hay que ordenar el hilo.

---

## Agents, skills y MCP: explicación profunda y simple

## Agents

Los **agents** son ejecutores especializados para tareas concretas (investigar, estructurar, implementar, verificar). No son “dueños” del resultado. Son piezas de ejecución.

Punto crítico: un agent rinde bien cuando tiene **objetivo claro + límites claros + criterio de salida claro**.

## Skills

Las **skills** son guías reutilizables: indican cómo resolver una clase de tareas con un orden consistente.

Beneficios:

- menos variabilidad entre ejecuciones;
- mejor repetibilidad;
- salida con formato esperable para revisión.

Sin skills, dos pedidos similares pueden terminar en estilos incompatibles.

## MCP

**MCP** refiere a conectores de contexto/herramientas. Permiten consultar fuentes o ejecutar acciones permitidas dentro de un marco de gobernanza.

Realidad operativa importante:

- acceso no es infinito;
- permisos cambian por entorno;
- algunas integraciones existen y otras no;
- seguridad y cumplimiento marcan fronteras.

Por eso nunca se promete una automatización que no esté confirmada en el entorno actual.

---

## OpenCode: dónde se materializa el trabajo

## Qué representa OpenCode en OSORIA

**OpenCode** es el entorno donde se hace la parte técnica asistida: lectura de contexto, edición autorizada, verificación de consistencia y preparación de entregables.

En lenguaje llano:

- Discord coordina;
- Hermes encuadra;
- OpenCode ejecuta;
- el equipo humano aprueba o pide ajustes.

## Qué sí y qué no esperar de OpenCode

Sí esperar:

- velocidad para tareas bien delimitadas;
- producción de artefactos claros;
- soporte para iterar con feedback.

No esperar:

- autonomía total sobre decisiones de negocio;
- bypass de procesos de aprobación;
- control de producción sin responsables humanos.

---

## PRD y PR: diferencias, relación y límites

## Qué es un PRD en este flujo

Un **PRD** (Product Requirements Document) captura problema, objetivo, alcance, criterios de éxito y restricciones. Es la brújula del trabajo.

## Qué es un PR en este flujo

Un **PR** (pull request) es el paquete de cambios propuesto para revisión. Debería explicar qué cambió, por qué cambió y cómo se validó.

## Relación entre PRD y PR

Simplificado:

- PRD define qué se busca y cómo se mide;
- PR implementa cambios para cumplir eso;
- la revisión del PR contrasta contra el PRD (o definición equivalente).

Sin referencia de objetivo, el PR queda “bonito” pero difícil de validar.

---

## Qué significa “PRD aprobado”

## Lo que SÍ significa

Que el equipo acordó, de forma explícita:

- problema a resolver;
- objetivo concreto;
- alcance y fuera de alcance;
- criterios de aceptación;
- supuestos conocidos y riesgos relevantes.

También significa que hay suficiente claridad para comenzar ejecución sin depender de adivinación permanente.

## Lo que NO significa

Un PRD aprobado **no significa**:

- que todo está perfecto e inmutable;
- que no se requerirá ajuste al descubrir datos nuevos;
- que la implementación ya está aprobada automáticamente;
- que se puede omitir validación técnica/funcional;
- que el merge está garantizado.

En otras palabras: aprobación de PRD habilita avanzar, no habilita apagar pensamiento crítico.

## Señales de un PRD insuficiente

Se considera incompleto cuando aparecen frases como:

- “mejorar experiencia” sin indicador;
- “hacerlo rápido” sin alcance;
- “ya saben” sin evidencia;
- “siempre se hizo así” sin documento.

Cuando pasa eso, lo correcto es pausar y pedir clarificación.

---

## Capacidades actuales y limitaciones reales

## Capacidades

Hoy el flujo muestra fortalezas en:

- ordenar información dispersa;
- acelerar documentación y propuestas;
- convertir ideas en pasos accionables;
- mantener formato consistente en entregables;
- reducir tiempos de primera versión.

## Limitaciones

También tiene limitaciones que no hay que negar:

- depende de contexto explícito;
- puede malinterpretar términos de negocio ambiguos;
- puede proponer algo técnicamente prolijo pero funcionalmente incorrecto;
- no reemplaza aprobación humana en temas críticos;
- está condicionado por permisos, integraciones y políticas de entorno.

Conclusión práctica: **capacidad no es autonomía**.

---

## Fronteras de responsabilidad: quién decide qué

## Decisiones que siguen siendo humanas

Siempre humanas:

- priorización de negocio;
- aceptación de alcance;
- aprobación de cambios de riesgo;
- definición de “listo para producción”;
- aprobación de merge;
- decisión de despliegue.

## Responsabilidades de quien solicita

Quien pide debe:

- explicar problema con contexto;
- definir objetivo y criterio de éxito;
- adjuntar evidencia;
- responder aclaraciones en tiempo razonable.

## Responsabilidades de quien revisa

Quien revisa debe:

- validar contra criterios acordados;
- señalar desvíos concretos;
- evitar aprobar por presión o urgencia verbal.

---

## Cómo redactar un buen pedido

## Estructura recomendada

Formato base:

1. Contexto
2. Objetivo
3. Alcance (incluye/excluye)
4. Prioridad
5. Criterios para validar
6. Evidencia adjunta

## Plantilla sugerida

> Contexto: …
>
> Objetivo: …
>
> Alcance (incluye/excluye): …
>
> Prioridad y plazo: …
>
> Cómo vamos a validar: …
>
> Evidencia: …

## Principios de redacción

- evitar adjetivos vacíos (“terrible”, “horrible”) sin hechos;
- usar hechos observables (qué, cuándo, dónde, a quién);
- separar síntoma de hipótesis;
- declarar explícitamente lo que no forma parte del pedido.

---

## Checklist antes de enviar una solicitud

- [ ] Expliqué el problema en términos concretos.
- [ ] Dije por qué importa para OSORIA (cliente, operación, costo, reputación, cumplimiento).
- [ ] Definí objetivo medible o verificable.
- [ ] Marqué alcance y fuera de alcance.
- [ ] Asigné prioridad realista (no emocional).
- [ ] Adjunté evidencia suficiente.
- [ ] Aclaré qué significa “resultado aceptable”.
- [ ] Confirmé quién valida del lado negocio.

Si no podés marcar al menos 6 de 8, conviene mejorar el pedido antes de enviarlo.

---

## Qué hacer cuando te piden clarificación

## No tomarlo como freno

Cuando llega una pregunta de clarificación, no es burocracia: es prevención de retrabajo.

## Responder con precisión

La respuesta ideal aclara:

- dato faltante;
- decisión de alcance;
- prioridad real;
- criterio de aceptación.

## Si no sabés la respuesta

Decí explícitamente “dato pendiente” y asigná responsable/fecha para conseguirlo. Lo peor es adivinar.

---

## Cómo leer actualizaciones de progreso

## Estructura típica de un update

Un update útil suele responder cuatro preguntas:

1. ¿Qué se hizo?
2. ¿Qué falta?
3. ¿Qué riesgo apareció?
4. ¿Qué decisión se necesita?

## Señales de buen update

- menciona avance contra objetivo, no solo actividad;
- separa hechos de interpretación;
- explicita bloqueos;
- propone siguiente paso concreto.

## Señales de alerta

- “vamos bien” sin evidencia;
- “falta poco” sin criterio;
- “quedó listo” sin validación;
- cambio de alcance no comunicado.

---

## Cómo leer un handoff final

## Qué debería traer un handoff serio

Un handoff final debería incluir:

- resumen de cambios;
- vínculo con objetivo inicial;
- evidencia de validación;
- limitaciones o riesgos remanentes;
- recomendación de próximo paso.

## Qué revisar antes de aceptar

- ¿resuelve el problema original o uno parecido?
- ¿respeta fuera de alcance?
- ¿hay evidencia verificable?
- ¿quedaron supuestos sin confirmar?

---

## Cómo validan resultados los perfiles no técnicos

## Marco simple de validación

No hace falta programar para validar bien. Usá este marco:

1. **Pertinencia**: responde lo pedido.
2. **Claridad**: se entiende sin traducción adicional.
3. **Evidencia**: hay pruebas observables.
4. **Impacto**: mejora algo relevante.
5. **Riesgo**: no introduce problemas obvios no tratados.

## Preguntas de validación recomendadas

- ¿Qué problema concreto quedó resuelto?
- ¿Cómo lo comprobamos?
- ¿Qué usuarios/áreas se benefician?
- ¿Qué puede salir mal y cómo se monitorea?
- ¿Qué NO se resolvió aún?

## Error común en validación no técnica

Confundir “texto prolijo” con “solución correcta”. Una entrega puede estar muy bien escrita y aun así no resolver el problema de fondo.

---

## Evidencia mínima para reportar bugs

## Qué evidencia adjuntar siempre

Para un bug útil, adjuntar:

- descripción del síntoma;
- pasos para reproducir;
- resultado esperado vs observado;
- fecha/hora aproximada;
- entorno (si aplica: web móvil/escritorio, tipo de usuario);
- capturas o video corto;
- impacto estimado (ventas, operación, tickets).

## Qué evitar

- “anda mal” sin pasos;
- hipótesis como si fueran hechos;
- screenshots sin contexto;
- reportes sin prioridad ni impacto.

## Plantilla breve de evidencia

> Síntoma observado: …
>
> Pasos para reproducir: 1) … 2) … 3) …
>
> Esperado: …
>
> Observado: …
>
> Impacto: …
>
> Evidencia adjunta: …

---

## Malentendidos comunes y correcciones

## “Si está aprobado el PRD, ya está todo aprobado”

Incorrecto. PRD aprobado habilita ejecución, no reemplaza revisión de implementación.

## “La IA ya sabe cómo funciona OSORIA”

Incorrecto. Sabe lo que se le da como contexto. Lo no documentado no existe para el flujo.

## “Si responde rápido, debe estar bien”

Incorrecto. Velocidad no equivale a calidad ni validez.

## “Urgente” resuelve falta de contexto

Incorrecto. Urgencia sin datos aumenta errores y demora real por retrabajo.

## “Si hay un PR, podemos hacer merge directo”

Incorrecto. Todo merge requiere revisión y aprobación humana según responsabilidad definida.

---

## Límites sobre producción, merge y despliegue

## Producción

El workflow no autoriza, por sí mismo, cambios directos en producción fuera del proceso humano de aprobación. Producción requiere controles y responsables.

## Merge

Tener un PR abierto no implica autorización automática de merge. El merge se decide tras validar calidad, alcance, riesgos y cumplimiento de criterios.

## Despliegue

El despliegue es una decisión operativa separada, con responsables y ventanas definidas por la organización. No se asume automatización total sin confirmación explícita.

## Aprobaciones

Las aprobaciones deben ser trazables y explícitas. “Entiendo que estaba ok” no alcanza para cambios sensibles.

---

## Escenarios OSORIA: ejemplos de pedidos buenos y malos

## Caso 1: bug en checkout (ecommerce)

### Malo

“Se rompió pagos. Ver urgente.”

Problemas: no hay pasos, no hay evidencia, no hay alcance, no hay criterio.

### Bueno

“Contexto: desde hoy 10:20 cayó la conversión mobile. En checkout con tarjeta aparece error al confirmar.

Objetivo: identificar causa probable y proponer corrección de menor riesgo hoy.

Alcance: diagnóstico, propuesta y validación de caso principal. Excluye rediseño completo.

Prioridad: alta.

Validar: pago exitoso en mobile para flujo estándar + confirmación de soporte.

Evidencia: capturas, ticket soporte #A-241, métrica de caída adjunta.”

## Caso 2: mejora de producto

### Malo

“Mejorar home para vender más.”

### Bueno

“Contexto: usuarios no encuentran categorías destacadas en home.

Objetivo: aumentar CTR de bloques de categoría.

Alcance: reorganizar orden y copy de bloques existentes. Excluye nuevo buscador.

Validar: comparar CTR 30 días contra línea base.

Prioridad: media-alta por campaña próxima.”

## Caso 3: documentación interna

### Malo

“Documentar todo.”

### Bueno

“Crear guía interna para onboarding de soporte sobre flujo de reporte de bugs.

Debe incluir: checklist de evidencia, ejemplos buenos/malos, tiempos esperados y escalamiento.

Tono: claro para no técnicos.

Entrega esperada: documento único con secciones y plantillas reutilizables.”

## Caso 4: comportamiento administrativo

### Malo

“No me cierra el panel admin, revísenlo.”

### Bueno

“En panel admin de órdenes, el filtro por estado no devuelve resultados esperados para ‘Pagado’ durante la mañana.

Objetivo: validar si es problema de datos, filtro o lectura visual.

Evidencia: 3 órdenes con IDs concretos + capturas del filtro aplicado.

Validar: que búsqueda por estado refleje exactamente el dataset esperado.”

## Caso 5: consulta operativa

### Malo

“¿Cómo estamos con esto?”

### Bueno

“Necesito estado de iniciativa X para comité de las 16:00.

Formato pedido: avance logrado, riesgos abiertos, decisión requerida, próximo hito.

Límite: resumen de máximo 10 líneas + una recomendación.”

---

## Buenas prácticas para conversaciones en Discord

## Antes de enviar

- leer una vez y verificar si un tercero entendería el pedido;
- separar problema de solución propuesta;
- verificar que la evidencia realmente soporte lo que afirmás.

## Durante la conversación

- responder preguntas puntuales;
- marcar cambios de alcance explícitamente;
- evitar sumar requerimientos colaterales “de paso”.

## Al cerrar

- dejar claro qué se aprobó;
- registrar pendientes;
- indicar responsable del siguiente paso.

---

## Checklist antes de revisar o aprobar un resultado

- [ ] El resultado responde al objetivo inicial.
- [ ] Se respetó alcance y fuera de alcance.
- [ ] Hay evidencia de validación suficiente.
- [ ] Los riesgos conocidos están explicitados.
- [ ] No hay supuestos críticos sin confirmar.
- [ ] La recomendación final es clara (aprobar, ajustar, escalar).
- [ ] Las responsabilidades de siguiente paso están asignadas.

Si faltan dos o más ítems, no conviene aprobar todavía.

---

## Cómo escalar cuando algo no cierra

Escalar no es “hacer drama”; es cuidar calidad y tiempos.

Escalá cuando:

- faltan datos clave para decidir;
- hay conflicto entre áreas sobre alcance;
- el riesgo supera la capacidad de validación rápida;
- el impacto de error puede afectar clientes o ingresos.

Escalar bien implica describir:

- qué está bloqueado,
- qué decisión se necesita,
- qué opciones existen y sus trade-offs.

---

## Señales de madurez del equipo usando este workflow

Un equipo maduro en este esquema:

- pide con claridad sin sobredimensionar urgencias;
- usa evidencia en vez de opiniones aisladas;
- valida por criterio y no por intuición;
- documenta decisiones para no repetir discusiones;
- acepta correcciones tempranas para evitar retrabajo costoso.

No se mide por “cuánta IA usa”, sino por **cómo integra IA con responsabilidad**.

---

## Límites éticos y de comunicación

## Honestidad sobre capacidades

No prometer automatizaciones no confirmadas. Si no está disponible, se dice “no disponible”.

## Evitar tecnicismo innecesario

La comunicación interna debe ser entendible para áreas no técnicas. Más claridad, menos jerga.

## Trazabilidad mínima

Las decisiones relevantes deben dejar rastro. La memoria oral no escala.

---

## Responsabilidades por rol (orientativo)

## Quien solicita

- define problema, impacto y objetivo;
- aporta evidencia;
- responde aclaraciones.

## Quien coordina

- ordena prioridad;
- cuida alcance;
- destraba decisiones entre áreas.

## Quien ejecuta

- trabaja dentro del alcance;
- explicita riesgos y límites;
- entrega con trazabilidad.

## Quien aprueba

- valida criterios de aceptación;
- evalúa riesgo residual;
- decide merge/despliegue según proceso.

---

## Preguntas frecuentes (FAQ)

## ¿Puedo pedir algo incompleto y “vemos sobre la marcha”?

Podés, pero vas a pagar con retrabajo. Conviene invertir cinco minutos en claridad antes que dos días en correcciones.

## ¿Todo necesita PRD largo?

No. Algunas tareas piden una definición breve. Lo importante es no perder problema, objetivo, alcance y criterios.

## ¿Si algo es urgente se puede saltear validación?

No en temas críticos. En urgencia se simplifica formato, no se elimina responsabilidad.

## ¿Un perfil no técnico puede rechazar una entrega?

Sí, si no cumple criterios de negocio o evidencia. La validación funcional no es exclusiva del área técnica.

## ¿Qué hago si no entiendo un update?

Pedir traducción a formato simple: avance, riesgo, decisión pendiente, siguiente paso.

---

## Mini guía de validación por tipo de pedido

## Bug

- se reproduce antes;
- deja de reproducirse después;
- no rompe flujo adyacente crítico.

## Mejora de producto

- cumple objetivo definido;
- no excede alcance acordado;
- tiene forma de medir impacto.

## Documentación

- es comprensible para la audiencia;
- tiene estructura y ejemplos;
- refleja realidad operativa actual.

## Operativo/administrativo

- aclara decisión o procedimiento;
- reduce ambigüedad de trabajo;
- deja responsables explícitos.

---

## Antipatrones a evitar

- pedir “todo” y priorizar “nada”;
- aceptar entregas sin evidencia;
- confundir volumen de texto con calidad;
- cambiar objetivo a mitad del camino sin avisar;
- usar Discord como chat informal para decisiones críticas sin registro.

---

## Guía práctica para priorizar solicitudes en OSORIA

## Matriz simple: impacto vs urgencia

Para salir del “todo es urgente”, usá esta lógica mínima:

- **Impacto alto + urgencia alta**: priorizar ahora, con alcance acotado y validación rápida.
- **Impacto alto + urgencia baja**: planificar bien, no improvisar.
- **Impacto bajo + urgencia alta**: resolver contención mínima y revisar si la urgencia es real.
- **Impacto bajo + urgencia baja**: agrupar para lote futuro.

Esta matriz evita que el equipo entre en modo incendio permanente.

## Qué significa impacto en ecommerce

En OSORIA, impacto puede venir por:

- caída de conversión o ticket promedio;
- fricción de compra en pasos críticos;
- errores de operación interna que frenan despacho;
- confusión en comunicación de precios/promos;
- reprocesos administrativos frecuentes.

No todo impacto es “ventas hoy”. También importa costo operativo y experiencia del cliente.

## Qué significa urgencia real

Urgencia real implica ventana de tiempo limitada para evitar daño mayor. Ejemplos:

- bug activo en checkout durante pico de tráfico;
- información incorrecta que puede generar reclamos masivos;
- bloqueo operativo que impide facturar o despachar.

No es urgencia real:

- “me gustaría verlo hoy” sin impacto;
- “queda más lindo” sin objetivo;
- “así nos quedamos tranquilos” sin evidencia.

---

## Cómo convertir pedidos difusos en pedidos ejecutables

## Técnica de las 5 preguntas

Cuando un pedido llega en bruto, aplicar estas cinco preguntas:

1. ¿Qué problema observable queremos resolver?
2. ¿A quién afecta y cómo?
3. ¿Cuál es la evidencia disponible?
4. ¿Qué cambio mínimo ya sería valioso?
5. ¿Cómo validamos que funcionó?

Con estas respuestas, un pedido suele pasar de ambiguo a accionable.

## Ejemplo OSORIA: pedido difuso a pedido ejecutable

Pedido difuso: “la tienda está lenta, hagan algo”.

Transformación:

- problema observable: tiempo alto en carga de listado de productos al aplicar filtros;
- afectados: usuarios móviles en campaña actual;
- evidencia: capturas de tiempos y reportes de soporte;
- cambio mínimo valioso: reducir fricción en el flujo principal de filtrado;
- validación: comparación de tiempos percibidos y abandono de sesión en etapa de navegación.

Resultado: ya existe un foco real para trabajar.

---

## Lectura avanzada de progreso: cómo no confundirse

## Actividad no es avance

“Trabajamos mucho” no alcanza. Avance significa acercarse al objetivo con evidencia.

Ejemplo de mala lectura:

- “se actualizaron varios documentos”

Ejemplo de buena lectura:

- “se definió criterio de validación y quedó cerrada la ambigüedad de alcance; eso habilita ejecución sin retrabajo”.

## Bloqueos bien redactados

Un bloqueo bien informado incluye:

- qué falta;
- por qué bloquea;
- quién puede destrabar;
- cuál es la decisión puntual requerida.

Sin esos cuatro elementos, el bloqueo se convierte en ruido.

## Estado recomendado en términos de negocio

Cuando leas un avance, buscá estas frases:

- “impacto esperado”
- “riesgo residual”
- “decisión pendiente”
- “criterio de cierre”

Si no aparecen, pedilas explícitamente.

---

## Handoff final: pauta de calidad para aceptación formal

## Estructura recomendada del cierre

Un cierre robusto debería traer cinco bloques:

1. **Qué se entregó** (resumen claro y concreto).
2. **Qué objetivo cubre** (vínculo con PRD o requerimiento).
3. **Cómo se validó** (evidencia y criterios usados).
4. **Qué riesgos quedan** (si existen).
5. **Qué sigue** (siguiente paso y responsable).

## Criterio de rechazo saludable

Rechazar una entrega no es “frenar al equipo”. Es una práctica sana cuando:

- no hay evidencia verificable;
- el resultado no coincide con objetivo acordado;
- aparecen supuestos críticos no aclarados;
- el impacto potencial de error no está controlado.

El rechazo con fundamento ahorra costos futuros.

---

## Validación para áreas no técnicas: guía por preguntas

## Preguntas que aumentan calidad

Cuando recibís un resultado, hacé estas preguntas en orden:

1. ¿Cuál era el problema original?
2. ¿Qué cambió exactamente?
3. ¿Cómo sé que eso mejora la situación?
4. ¿Qué evidencia respalda la mejora?
5. ¿Qué no se resolvió todavía?

Con estas cinco preguntas evitás aprobar por apariencia.

## Diferencia entre “entendible” y “validado”

Un texto entendible facilita comunicación. Un resultado validado demuestra efectividad. Necesitamos ambos.

En términos simples:

- entendible = se comprende;
- validado = se comprobó.

---

## Protocolo de evidencia en reportes de bug

## Evidencia mínima, recomendada y excelente

**Mínima**:

- síntoma;
- pasos de reproducción;
- esperado vs observado.

**Recomendada**:

- hora aproximada;
- tipo de usuario;
- capturas con contexto.

**Excelente**:

- impacto estimado;
- recurrencia (cuántas veces ocurre);
- ejemplos comparables donde sí funciona.

Mientras más completa la evidencia, más corto el ciclo de resolución.

## Errores típicos de evidencia

- captura recortada sin URL/estado visible;
- video largo sin marcar minuto clave;
- reporte con hipótesis técnica presentada como certeza;
- ausencia total de comparación esperado/observado.

---

## Gobernanza de cambios: producción, merge y despliegue

## Principio de separación de decisiones

En OSORIA conviene separar claramente:

- decisión de **qué** cambiar (negocio/producto),
- decisión de **cómo** cambiar (ejecución técnica),
- decisión de **cuándo** integrar (merge),
- decisión de **cuándo** exponer al usuario final (despliegue/producción).

Mezclar esas decisiones en una sola charla suele producir errores de coordinación.

## Qué revisar antes de merge

- cumplimiento de alcance acordado;
- evidencia de validación;
- riesgos explícitos;
- responsables de seguimiento post-merge.

## Qué revisar antes de producción

- impacto potencial en clientes;
- plan de comunicación (si aplica);
- monitoreo posterior al cambio;
- plan de contingencia razonable.

Nada de esto requiere tecnicismo extremo; requiere disciplina operativa.

---

## Escenarios ampliados OSORIA por tipo de necesidad

## Escenario A: promoción comercial y reglas de carrito

Situación: equipo comercial quiere una promo para aumentar volumen durante fin de semana.

Error frecuente: pedir “activar promo ya” sin regla clara.

Pedido mejor estructurado:

- contexto: caída de volumen en franja de sábado por la tarde;
- objetivo: aumentar unidades por orden;
- alcance: promo sobre categoría puntual, con vigencia definida;
- exclusiones: no combinar con descuentos mayoristas;
- validación: comparar tasa de uso y margen en ventana acordada.

Aprendizaje: una promo sin reglas explícitas puede generar reclamos, margen negativo o comportamiento inesperado.

## Escenario B: documentación de proceso administrativo

Situación: el equipo administrativo necesita procedimiento claro para manejo de reclamos por facturación.

Pedido pobre: “armar guía completa de facturación”.

Pedido útil:

- audiencia: administración y soporte;
- alcance: flujo de reclamo, validación de datos, resolución y escalamiento;
- formato: pasos, checklist, ejemplos de casos típicos;
- validación: que una persona nueva pueda resolver caso estándar sin asistencia extra.

Aprendizaje: documentación útil se diseña para quien la usa, no para quien la redacta.

## Escenario C: pregunta operativa de dirección

Situación: dirección pide estado para reunión corta.

Formato recomendado:

- objetivo de la iniciativa;
- avance real (% o hitos concretos);
- riesgo más importante;
- decisión requerida de dirección;
- próximo hito con fecha.

Evitar: párrafos largos sin decisión accionable.

## Escenario D: ajuste de contenido en ecommerce

Situación: equipo de contenido detecta confusión en mensajes de envío.

Pedido útil:

- problema: usuarios abandonan cuando no entienden condiciones de envío;
- objetivo: claridad de condiciones en pantalla clave;
- alcance: revisión de texto y orden de información en sección definida;
- validar: reducción de consultas repetidas de soporte sobre el mismo punto.

Aprendizaje: mejoras de contenido también son producto y deben tener criterio de impacto.

---

## Gestión de expectativas: qué tiempos esperar

## Diferenciar tiempo de primera respuesta y tiempo de cierre

Primera respuesta rápida no equivale a cierre final. El cierre depende de claridad del pedido, evidencia, validación y decisiones pendientes.

## Qué acelera realmente

- pedido bien estructurado;
- evidencia completa desde el inicio;
- disponibilidad de responsable para aclaraciones;
- alcance acotado con criterio de cierre.

## Qué demora sistemáticamente

- pedidos mutantes (cambian cada día);
- múltiples objetivos mezclados;
- falta de dueño para aprobar;
- urgencias contradictorias entre áreas.

---

## Cómo construir confianza en el workflow

La confianza no se construye con promesas, se construye con repetición de buenas prácticas:

- pedir claro,
- ejecutar con límites,
- validar con evidencia,
- decidir con responsabilidad,
- documentar lo aprendido.

Cuando esto se vuelve hábito, el workflow deja de ser “novedad” y pasa a ser infraestructura cultural de trabajo.

---

## Señales de que hay que pausar y reencuadrar

Hay que frenar y reencuadrar cuando:

- el objetivo cambia antes de terminar cada avance;
- nadie puede explicar el criterio de éxito;
- se discuten soluciones sin consenso del problema;
- hay presión por merge sin revisión mínima;
- el riesgo supera la capacidad de monitoreo posterior.

Pausar a tiempo evita costos que después son mucho mayores.

---

## Cierre cultural: disciplina sin rigidez

Este manual propone disciplina, no rigidez ciega.

Disciplina significa:

- hablar claro,
- dejar evidencia,
- validar con criterio,
- sostener responsabilidades.

Rigidez ciega sería:

- exigir formato perfecto aunque el contexto sea urgente,
- confundir proceso con resultado,
- usar reglas para bloquear en vez de ordenar.

En OSORIA buscamos el punto sano: proceso suficiente para proteger calidad, flexibilidad suficiente para resolver problemas reales.

---

## Glosario

- **LLM**: modelo de lenguaje que asiste en tareas textuales y de estructuración.
- **Hermes**: capa operativa de orden y seguimiento de solicitudes.
- **Discord**: canal principal de comunicación y coordinación interna.
- **Agent / agents**: ejecutores especializados para tareas específicas.
- **Skill / skills**: guía reusable que define forma consistente de resolver tareas.
- **MCP**: conectores de contexto y herramientas bajo permisos definidos.
- **OpenCode**: entorno de ejecución técnica asistida.
- **PRD**: documento de requerimientos de producto (problema, objetivo, alcance, validación).
- **PR**: propuesta de cambios para revisión antes de integrar.
- **Capacidades**: lo que el sistema puede hacer bien hoy.
- **Limitaciones**: fronteras y riesgos que obligan validación humana.
- **Merge**: integración aprobada de cambios al flujo principal de trabajo.
- **Producción**: entorno real donde impactan usuarios/clientes.

---

## Recomendaciones finales

1. **Claridad primero**: si el pedido es difuso, la salida será difusa.
2. **Evidencia siempre**: sin evidencia, la conversación se vuelve opinión.
3. **Validar no es desconfiar**: es gestión profesional del riesgo.
4. **Documentar decisiones**: evita repetir debates y errores.
5. **Separar urgente de importante**: priorizar mejor mejora resultados.
6. **Mantener límites**: producción, merge y despliegue requieren aprobación humana.
7. **Hablar simple**: si no se entiende, no sirve.

Una organización madura no es la que “aprieta más botones”, sino la que transforma herramientas en procesos confiables. Ese es el estándar que OSORIA busca sostener.
