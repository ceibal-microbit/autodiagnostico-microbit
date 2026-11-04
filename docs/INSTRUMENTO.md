# Instrumento — Autodiagnóstico docente micro:bit

Fuente de verdad de los textos y del puntaje. Versión del instrumento: **2026.1**. Basado en el documento "Autodiagnóstico docente" del programa, con tres errores de tipeo corregidos ("micro:bi" en el ítem 5, "en durante" y ".." en la pregunta de contexto 2).

## Introducción (pantalla de bienvenida)

> Este breve autodiagnóstico busca ayudarte a identificar tus fortalezas y oportunidades de desarrollo en el uso pedagógico de micro:bit. No hay respuestas correctas o incorrectas.
>
> Te invitamos a responder pensando en tu experiencia actual. Al finalizar, recibirás una devolución orientativa con algunas recomendaciones para seguir avanzando.

## Preguntas de contexto (no suman puntaje)

> Estas preguntas nos ayudan a comprender tu trayectoria. No forman parte del puntaje del autodiagnóstico.

Se guarda el número de opción elegida (1 = primera opción).

**ctx_1. ¿Hace cuánto tiempo utilizás micro:bit?**
1. Todavía no la utilicé.
2. La utilicé alguna vez.
3. Hace menos de un año.
4. Entre uno y dos años.
5. Hace más de dos años.

**ctx_2. ¿Participaste en alguna instancia de formación sobre micro:bit durante los últimos dos años?**
1. No.
2. Sí, en un curso introductorio.
3. Sí, en más de una instancia de formación (por ejemplo: cursos y talleres).
4. Sí, y además continúo explorando recursos o propuestas de forma autónoma.

**ctx_3. ¿Con qué frecuencia utilizás actualmente micro:bit con tus estudiantes?**
1. Todavía no la utilizo.
2. La utilicé de forma puntual.
3. Algunas veces durante el año.
4. Con bastante frecuencia (mensualmente).
5. Forma parte habitual de mis propuestas.

## Afirmaciones

> Ahora sí: ¿cómo es tu vínculo actual con la placa micro:bit? Para cada afirmación, indicá cuánto te representa actualmente.

Escala: 1 Nada · 2 Poco · 3 En parte · 4 Bastante · 5 Mucho.

### d1 — Autonomía técnica
1. Puedo crear o modificar programas en MakeCode para utilizarlos con micro:bit sin necesitar apoyo permanente de otra persona.
2. Cuando surge una dificultad técnica durante una actividad con micro:bit puedo identificar posibles causas y buscar una solución.
3. Me siento capaz de explorar nuevas funciones, componentes o posibilidades de micro:bit por mi cuenta.

**Qué observa:** Tu nivel de confianza y autonomía para utilizar la tecnología, resolver dificultades y explorar nuevas posibilidades.

### d2 — Uso pedagógico
4. Integro micro:bit en actividades vinculadas con objetivos de aprendizaje de mi área o nivel.
5. Puedo adaptar o diseñar actividades con micro:bit de acuerdo con las necesidades de mis estudiantes.
6. Utilizo micro:bit como parte de secuencias, proyectos o experiencias de aprendizaje y no únicamente como una actividad puntual.

**Qué observa:** En qué medida micro:bit está integrada a tus propuestas de enseñanza y vinculada con intenciones pedagógicas concretas.

### d3 — Apropiación pedagógica y condiciones para el uso
7. Encuentro oportunidades dentro de mi planificación para incorporar actividades con micro:bit.
8. Me siento seguro/a al implementar actividades con micro:bit frente a mis estudiantes, incluso cuando pueden surgir situaciones imprevistas.
9. Puedo seleccionar o adaptar propuestas con micro:bit sin depender exclusivamente de actividades ya diseñadas por otras personas.

**Qué observa:** En qué medida lográs incorporar micro:bit a tu práctica con confianza, flexibilidad y capacidad para tomar decisiones pedagógicas propias.

### d4 — Cultura tecnológica vinculada a micro:bit en el centro educativo
10. En mi centro educativo conozco cómo acceder a las placas micro:bit y otros recursos disponibles para utilizarlas.
11. En mi centro existen condiciones que facilitan la incorporación de micro:bit en las propuestas de aula.
12. El uso de micro:bit es conocido, compartido o promovido entre distintos docentes de mi centro educativo.

**Qué observa:** Las condiciones del centro educativo para facilitar el acceso, la circulación y el uso sostenido de micro:bit.

### d5 — Trabajo colaborativo e interdisciplinario
13. Existe un intercambio de ideas, experiencias o recursos sobre micro:bit con otros docentes.
14. He trabajado o me siento en condiciones de trabajar con otros docentes en propuestas que integren micro:bit.
15. Identifico posibilidades de conectar el uso de micro:bit con diferentes áreas, asignaturas o campos de conocimiento.

**Qué observa:** El grado en que el uso de micro:bit se vincula con el intercambio entre colegas y con propuestas que trascienden una única área de conocimiento.

## Puntaje y niveles

Para cada dimensión se suman sus 3 respuestas (S, de 3 a 15). El documento original define rangos sobre el promedio (S/3); como el promedio solo toma múltiplos de 1/3, equivalen exactamente a cortes enteros sobre la suma:

| Nivel | Promedio | Suma S |
| --- | --- | --- |
| A fortalecer (`f`) | 1,0 a 2,4 | 3 a 7 |
| En desarrollo (`d`) | 2,5 a 3,7 | 8 a 11 |
| Consolidada (`c`) | 3,8 a 5,0 | 12 a 15 |

Implementar con la suma (enteros), no con el promedio, para evitar errores de redondeo. El promedio se muestra con un decimal y coma: `3,7`.

**Tu próximo paso** (el servidor lo calcula, pero el perfil no lo muestra por decisión del 04/11/2026, ver `docs/DECISIONES.md`): la dimensión con menor suma. Si empatan dos, se nombran las dos; si empatan más, la primera en orden. Si todas son consolidadas, se muestra: "Todas tus dimensiones aparecen consolidadas. Un buen próximo paso puede ser compartir tu experiencia y acompañar a otros docentes que están comenzando."

## Devoluciones

Cada devolución tiene un texto y una recomendación. El rótulo de la recomendación es "Te recomendamos:" en los niveles `f` y `d`, y "Tu próximo desafío puede ser:" en `c`.

### d1 — Autonomía técnica
- **f:** Tu perfil muestra que uno de tus próximos pasos puede estar en ganar mayor confianza en el uso técnico de micro:bit. Explorar MakeCode, modificar programas existentes y familiarizarte con la resolución de pequeños problemas puede ayudarte a trabajar con mayor autonomía.
  **Recomendación:** comenzar con actividades simples de la Guía y del Cuaderno de Actividades micro:bit y animarte a modificar pequeñas partes de los programas propuestos.
- **d:** Ya contás con algunas herramientas para trabajar con micro:bit de manera autónoma, aunque todavía pueden surgir situaciones en las que necesites apoyo o mayor confianza.
  **Recomendación:** seguir explorando MakeCode, modificar programas existentes y enfrentarte progresivamente a pequeños desafíos técnicos que te permitan ganar seguridad y autonomía.
- **c:** La autonomía técnica aparece como una de tus fortalezas. Contás con herramientas para explorar, modificar y resolver situaciones de manera independiente.
  **Recomendación:** poner esa autonomía al servicio del diseño de propuestas pedagógicas más complejas o acompañar a otros docentes que están comenzando.

### d2 — Uso pedagógico
- **f:** Tu principal oportunidad puede estar en avanzar desde el conocimiento de la herramienta hacia su integración en propuestas de enseñanza.
  **Recomendación:** elegir un contenido u objetivo de aprendizaje de tu planificación y explorar de qué manera micro:bit podría ayudarte a abordarlo.
- **d:** Ya comenzaste a integrar micro:bit en tus propuestas de enseñanza, aunque todavía existe margen para profundizar su vínculo con los objetivos de aprendizaje y darle mayor continuidad en el aula.
  **Recomendación:** avanzar desde actividades puntuales hacia secuencias o proyectos en los que micro:bit tenga un propósito pedagógico claro y se vincule de forma más sostenida con tu planificación.
- **c:** micro:bit ya forma parte de tus decisiones pedagógicas y aparece integrada a objetivos de aprendizaje.
  **Recomendación:** profundizar propuestas de mayor duración, explorar nuevas metodologías o documentar experiencias que puedan inspirar a otros docentes.

### d3 — Apropiación pedagógica y condiciones para el uso
- **f:** Es posible que todavía existan algunas barreras para incorporar micro:bit con mayor autonomía o frecuencia.
  **Recomendación:** comenzar con propuestas acotadas, adaptar actividades existentes y avanzar progresivamente hacia diseños propios.
- **d:** Ya contás con experiencias que te permiten incorporar micro:bit en tus propuestas, aunque todavía podés fortalecer tu confianza para adaptar actividades, tomar decisiones propias y responder con mayor flexibilidad a situaciones imprevistas.
  **Recomendación:** partir de propuestas conocidas e introducir modificaciones graduales que respondan a tus objetivos y a las características de tu grupo.
- **c:** Mostrás un alto nivel de confianza para tomar decisiones pedagógicas vinculadas con micro:bit y adaptar las propuestas a las necesidades de tus estudiantes.
  **Recomendación:** experimentar con nuevos formatos, problemas abiertos o propuestas creadas por vos.

### d4 — Cultura tecnológica vinculada a micro:bit en el centro educativo
- **f:** Tu respuesta muestra que puede haber oportunidades para mejorar las condiciones de acceso, circulación o conocimiento de micro:bit dentro de tu centro.
  **Recomendación:** conocer qué recursos están disponibles, conversar con otros docentes que utilizan micro:bit e identificar oportunidades para compartir experiencias.
- **d:** En tu centro ya existen algunas condiciones y experiencias que favorecen el uso de micro:bit, aunque todavía pueden fortalecerse su circulación, visibilidad y aprovechamiento entre docentes.
  **Recomendación:** identificar qué recursos y experiencias ya existen en el centro y generar oportunidades para compartirlos, organizarlos o hacerlos más accesibles a otros docentes.
- **c:** Tu centro cuenta con condiciones favorables para el uso de micro:bit y existe una cultura que facilita su incorporación.
  **Recomendación:** contribuir a que esas experiencias circulen dentro del centro y que nuevos docentes puedan sumarse y participar de las iniciativas que se proponen desde el centro y desde Ceibal.

### d5 — Trabajo colaborativo e interdisciplinario
- **f:** Una oportunidad de desarrollo puede estar en conectar tu experiencia con micro:bit con la de otros docentes o áreas de conocimiento.
  **Recomendación:** identificar un colega, área o proyecto con el que pueda existir un punto de encuentro y pensar una primera actividad conjunta.
- **d:** Ya existen algunos intercambios o experiencias de colaboración en torno a micro:bit, pero todavía hay oportunidades para ampliar el trabajo conjunto y conectar la tecnología con otras áreas de conocimiento.
  **Recomendación:** buscar una oportunidad concreta para planificar o desarrollar una actividad con otro docente, partiendo de un objetivo, contenido o problema compartido.
- **c:** El intercambio y el trabajo con otros docentes aparecen como una fortaleza en tu perfil.
  **Recomendación:** impulsar proyectos interdisciplinarios de mayor alcance o compartir tu experiencia con otros equipos docentes.

## Cierre

> **No existe un único camino para avanzar con micro:bit.**
>
> Tu perfil refleja tu momento actual y puede cambiar a medida que experimentás, aprendés y compartís con otros.
>
> Nuestra sugerencia es que uses estas orientaciones para elegir qué dimensión fortalecer y, a partir de esa reflexión, puedas utilizar la Guía según tus propios intereses y necesidades.

## Pendiente

- Links definitivos a la Guía y al Cuaderno de Actividades micro:bit para las recomendaciones.
