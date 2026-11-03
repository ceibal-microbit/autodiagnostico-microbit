# CLAUDE.md — Autodiagnóstico docente micro:bit

Guía para Claude Code en este repositorio. Leerla completa antes de cada tarea.

## Qué es

Web app de Google Apps Script para el programa micro:bit de Ceibal (Uruguay). El docente completa un autodiagnóstico (datos, 3 preguntas de contexto, 15 afirmaciones en 5 dimensiones con escala 1–5), ve su perfil por dimensiones al terminar y recibe el perfil en PDF por correo. Cada envío se guarda como una fila en una Google Sheet.

Documentos de referencia, en este orden:
1. `docs/DECISIONES.md` — qué se decidió. No contradecirlo sin consultarlo.
2. `docs/INSTRUMENTO.md` — textos y reglas de puntaje. Fuente de verdad de los textos.
3. `docs/ARQUITECTURA.md` — piezas, contratos de las funciones públicas, columnas de la Sheet.
4. `docs/SEGURIDAD.md` — requisitos de seguridad. Cada fase los cumple.
5. `docs/PLAN.md` — fases y tareas. Trabajar fase por fase.

## Con quién trabajás

El responsable del proyecto (Santi) coordina el programa micro:bit, tiene formación en eléctrica y no revisa código línea por línea. Por eso:
- Explicá cada cambio en español simple: qué hace, por qué y cómo probarlo.
- Las descripciones de PR dicen qué cambia para el docente o para el equipo, no solo qué archivos.
- Ante una decisión de diseño que no esté en los documentos, preguntá antes de implementar.

## Reglas que no se rompen

1. **Nunca ejecutar clasp.** Ni `clasp push`, ni `clasp deploy`, ni `clasp login`, ni ningún otro comando de clasp, ni los scripts de npm que lo llaman. Subir código a Google lo hace solo una persona (ver `docs/DESPLIEGUE.md`). Está bloqueado en `.claude/settings.json`; no intentes rodearlo.
2. **Nunca leer ni tocar credenciales**: `.clasprc.json`, tokens, contraseñas.
3. **Nada de datos reales de Ceibal en el repo.** Ni el catálogo real de centros ni respuestas de docentes (nombres, cédulas, correos). Para tests: `test/fixtures/universo-sintetico.json` y `test/fixtures/casos-macheo.json`. Si te pasan un archivo con datos reales, no lo copies al repo.
4. **Solo dos funciones públicas del servidor** además de `doGet`: `obtenerDatosIniciales` y `guardarRespuesta`. Toda otra función de `src/*.js` termina en guion bajo (`limpiarCatalogo_`), para que no se pueda llamar desde el navegador. Única excepción: `onOpen`, porque Google exige ese nombre para el menú de la Sheet; solo arma el menú. Las funciones del menú terminan en guion bajo. `test/reglas.test.js` lo controla automáticamente.
5. **Permisos mínimos.** No agregar scopes a `src/appsscript.json` sin consultarlo. Los permitidos están en `docs/ARQUITECTURA.md`.
6. **El servidor no confía en el navegador.** Valida todo lo que recibe y recalcula puntajes y niveles; nunca guarda lo que calculó la página.

## Estructura

```
src/                     → se sube tal cual a Apps Script (rootDir de clasp)
  appsscript.json        → manifiesto: zona horaria, V8, scopes, configuración de web app
  nucleo.js              → LÓGICA PURA: puntajes, cédula, correo, validación, normalización, macheo,
                           protección contra fórmulas. Sin servicios de Google. Se testea con Node.
  Codigo.js              → doGet, obtenerDatosIniciales, guardarRespuesta (usa nucleo.js y la Sheet)
  Catalogo.js            → limpieza del Universo → pestaña Centros (menú de la Sheet)
  Correo.js              → PDF del perfil y envío por mail
  index.html             → la página (parte del prototipo de docs/prototipo/)
test/                    → node:test sobre nucleo.js; fixtures sintéticos
tools/usar-entorno.js    → elige el proyecto de Apps Script (prueba/producción) para clasp
```

### Código compartido entre Apps Script y Node

En Apps Script todos los `.js` de `src/` comparten un mismo espacio global; no hay `require` ni `import`. Para poder testear `nucleo.js` con Node, ese archivo termina así:

```js
if (typeof module !== 'undefined') {
  module.exports = { calcularPerfil, cedulaValida /* ... */ };
}
```

En Apps Script `module` no existe y el bloque se ignora. No uses `require`, `import`, `export` ni APIs de Node dentro de `src/`. Usá JavaScript compatible con el runtime V8 de Apps Script.

### Lógica que también necesita la página

El buscador de centros corre en el navegador. Si una función de `nucleo.js` también hace falta en la página (por ejemplo, normalizar texto), la fuente de verdad es `nucleo.js`. Cómo llevarla a la página se define en la fase 4 (ver `docs/PLAN.md`); no dupliques lógica sin dejarlo anotado.

## Tests

- `npm test` corre `node --test`. Sin dependencias externas.
- Toda función de `nucleo.js` tiene tests. Los casos de `test/fixtures/casos-macheo.json` deben pasar todos.
- El CI de GitHub corre los tests en cada push y PR. Un PR no se mergea con el CI en rojo.

## Versiones

- `VERSION` vive en `src/nucleo.js` y sigue semver (`0.1.0`, `0.2.0`…).
- La página muestra la versión en el pie y cada fila guardada la registra en `version_app`.
- Al cerrar una fase: subir `VERSION`, actualizar `docs/PLAN.md` y crear el tag `vX.Y.Z` tras el merge.

## Flujo de trabajo

1. Una rama por tarea o fase (`fase-2-nucleo`, `fix-cedula`…).
2. Implementar con tests.
3. Pedir revisión a los agentes `revisor` y `auditor-seguridad` (`.claude/agents/`) y corregir lo que marquen como crítico o importante.
4. PR con descripción en español simple. CI en verde.
5. Santi mergea y despliega con clasp siguiendo `docs/DESPLIEGUE.md`.

## Estilo

- Textos que ve el docente: español rioplatense con voseo ("completá", "elegí"), como en `docs/INSTRUMENTO.md`.
- Nombres de funciones y variables en español, en camelCase.
- Commits en español, en presente: "Agrega validación de cédula".
