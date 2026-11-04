# Estado del proyecto

Última actualización: 04/11/2026 · versión de la app: **0.3.0** · tags en GitHub: `v0.1.0`, `v0.2.0`, `v0.3.0`.

Este archivo es el "pase de posta": resume dónde está el proyecto y qué se decidió conversando que todavía no figura en otro documento. Se actualiza al cerrar cada fase o cuando se toma una decisión nueva. Los documentos de referencia siguen siendo los de `CLAUDE.md`, en ese orden; si algo de acá contradice a `docs/DECISIONES.md`, manda `DECISIONES.md`.

## Dónde estamos

| Fase | Estado |
| --- | --- |
| 1 — Preparación (v0.1.0) | Cerrada. Verificada en Google. |
| 2 — Núcleo con tests (v0.2.0) | Cerrada. Mergeada. |
| 3 — Sheet y catálogo (v0.3.0) | Cerrada. Probada a mano con el Universo real en la Sheet de prueba. |
| 4 — Web app (v0.4.0) | **En curso.** Página y servidor programados. Pruebas en celular hechas (unos 8 segundos de carga, con la franja de Google). Faltan las pruebas en la Sheet de prueba. |
| 5 — PDF y mail | Diseño acordado: botones de PDF y mail en el perfil, a pedido del docente (ver `DECISIONES.md`). Sin programar. |
| 6 — Auditoría · 7 — Piloto | Pendientes. |

**Qué existe hoy**
- `src/nucleo.js`: puntajes y niveles, cédula, correo, protección contra fórmulas, normalización, limpieza del Universo, validación de envíos, macheo de texto libre. Tests en verde y CI de GitHub en verde.
- `src/Catalogo.js` y `src/textos.js`: menú **Autodiagnóstico** en la Sheet con "Preparar planilla" y "Actualizar catálogo". Probado con el Universo real: 4047 centros, 157 filas repetidas sacadas, 2 descartadas por no tener departamento, 7 con observaciones.
- `src/Codigo.js`, `src/index.html`, `src/app.html`, `src/buscador.html` y `src/estilos.html`: la web app (formulario, guardado y perfil en pantalla). Todavía no manda mails. `src/Correo.js` está vacío.

## Decisiones tomadas después de `DECISIONES.md`

Cédula y correo
- La cédula se guarda siempre con **8 dígitos** (se rellena con ceros a la izquierda) y la columna lleva formato "Texto sin formato". Así "1234567" y "01234567" cuentan como la misma para el límite de 3 envíos por día.
- El correo se guarda **todo en minúsculas**.
- Se rechazan en los textos los caracteres invisibles o que invierten la dirección del texto.

Catálogo
- El **tipo de centro** (escuela, jardín, liceo, UTU…) sale del nombre; "Tipo dependencia" solo se usa si el nombre no alcanza.
- El número de escuelas y jardines públicos de DGEIP sale del código (`11` + departamento + 3 dígitos), solo si el centro es escuela o jardín.
- Los departamentos fuera de Uruguay quedan en Centros marcados en `observacion`. Pendiente: no mostrarlos a los docentes en `obtenerDatosIniciales`.
- "Actualizar catálogo" escribe solo en Centros, usa el bloqueo del script, escribe primero y limpia después, y pide una **segunda confirmación si el catálogo baja más del 20%**.

Textos
- La app lee los textos de la pestaña **Textos** de la Sheet. `src/textos.js` es solo la carga inicial y se **genera** desde `docs/INSTRUMENTO.md` con `node tools/generar-textos.js` (un test avisa si están desfasados).
- "Preparar planilla" nunca pisa lo que el equipo editó. Si el equipo cambia un texto en la Sheet y quiere que quede definitivo, hay que actualizar también `INSTRUMENTO.md` y regenerar `textos.js`.
- Los textos de la pestaña Textos se tratan como **no confiables**: nunca se insertan como HTML.

Macheo
- En la versión 1, "No encuentro mi centro" guarda el texto libre como `pendiente de revisión`. El macheo automático es una ayuda para revisar esos casos y **no corre al enviar**. Confirmado.

Config
- Mientras se prueba, los topes quedan al mínimo (ver `DECISIONES.md`, "Mails y topes"). Hoy Config todavía tiene `max_envios_hora` vacío; la fase 4 agrega los parámetros que faltan.

Versiones
- `VERSION` sube a la nueva versión **al cerrar la fase**, después de la prueba real, no antes. El tag `vX.Y.Z` se crea después del merge.

## Qué sigue (fase 4)

La lista completa está en `docs/PLAN.md`. Lo que falta decidir:
- Cómo conviven el formato "Texto sin formato" y el apóstrofo delante de `=`, `+`, `-`, `@` en Respuestas (se decide con la prueba de la sección 9 de `docs/SEGURIDAD.md`).

Pendiente de fases posteriores que no hay que perder: las cuatro pruebas manuales de la fase 3 que no se hicieron (están en la fase 6 del plan), subir los topes de prueba antes del piloto.

## Pendientes fuera del código
Legal (consentimiento, plazo de conservación, registro ante la URCDP) · logo oficial y tipografía Ceibal Mozaic · links definitivos de la Guía y del Cuaderno de Actividades.

Cuota de mails: la cuenta dedicada es **Workspace**. Según la documentación de Google son 1.500 destinatarios por día, y la cuota se renueva 24 horas después del primer envío, no a una hora fija. Las cuentas de prueba (*trial*) tienen límites menores. Falta confirmar el valor real en la cuenta durante la fase 5.

## Cómo trabajamos
1. Una rama por tarea o fase.
2. Antes de implementar una fase: Claude cuenta en español simple cómo piensa organizarla y **espera el OK** de Santi.
3. Se implementa con tests. Al terminar se pide revisión a los agentes `revisor` y `auditor-seguridad` (`.claude/agents/`) y se corrige lo crítico e importante.
4. Se sube la rama y Santi abre el PR en GitHub (en la PC de trabajo no está instalado `gh`), con CI en verde. Santi mergea.
5. Después del merge se crea el tag y, cuando corresponde, Santi sube el código con clasp.
6. **Claude nunca ejecuta clasp** ni toca credenciales. Si PowerShell bloquea `npm` o `clasp`, usar `npm.cmd` y `clasp.cmd`.

## Qué NO está en el repositorio (hay que rehacerlo en cada PC)
- `.clasp.prueba.json` con el `scriptId` del proyecto de prueba (copiar `.clasp.prueba.example.json`; ver `docs/DESPLIEGUE.md`).
- El inicio de sesión de clasp (`clasp login`, con la cuenta dedicada del programa). **No copiar `.clasprc.json` entre computadoras.**
- La Sheet de prueba y el Universo real: viven solo en la unidad compartida del programa.

## Retomar en otra computadora
1. Instalar Git, Node (20 o más) y VS Code con la extensión de Claude Code; iniciar sesión.
2. `git clone https://github.com/ceibal-microbit/autodiagnostico-microbit.git` (la cuenta de GitHub tiene que tener acceso a la organización).
3. En la carpeta: `npm test` (no hay dependencias que instalar). Tienen que pasar todos los tests.
4. Abrir la carpeta en VS Code y decirle a Claude: *"Leé CLAUDE.md, los documentos de docs/ en el orden que indica y docs/ESTADO.md, y retomamos desde el punto en que estamos."*
