# Plan de trabajo

Una fase por vez. Cada fase cierra con: tests en verde, revisión de `revisor` y `auditor-seguridad`, PR mergeado, versión etiquetada y, cuando corresponde, despliegue al proyecto de prueba.

## Fase 1 — Preparación (v0.1.0)

Objetivo: el circuito completo funciona de punta a punta con una página mínima.

- [x] Crear el repo privado `ceibal-microbit/autodiagnostico-microbit` y subir este kit.
- [ ] Confirmar que `npm test` y el CI de GitHub pasan.
- [x] En la cuenta dedicada: activar la API de Apps Script.
- [x] Crear la Sheet de **prueba** en la unidad compartida y, desde ella, el script vinculado (*Extensiones → Apps Script*).
- [x] Instalar clasp y hacer el primer `clasp push` al proyecto de prueba (ver `docs/DESPLIEGUE.md`).
- [x] Implementar como web app y abrir el link: debe mostrar "Autodiagnóstico docente micro:bit — versión 0.1.0".
- [x] Verificar que `SpreadsheetApp.getActiveSpreadsheet()` funcione dentro de la web app con el scope `spreadsheets.currentonly`. La página mínima muestra el nombre de la Sheet.

## Fase 2 — Núcleo con tests (v0.2.0)

Todo en `src/nucleo.js`, sin servicios de Google, con tests:

- [x] Puntaje por dimensión, nivel por suma, promedio, próximo paso (empates y "todas consolidadas").
- [x] Validación de cédula uruguaya (dígito verificador) y formato.
- [x] Validación de correo y sugerencia de dominio ("gmial.com" → "gmail.com").
- [x] Validación completa de un envío (reglas de `docs/SEGURIDAD.md`, sección 3), con un catálogo recibido como parámetro.
- [x] Protección contra fórmulas (apóstrofo delante de `=`, `+`, `-`, `@`).
- [x] Normalización de texto (tildes, mayúsculas, "Nº", "nro", "esc.", "lic", "JN", "UTU"…).
- [x] Limpieza del Universo → filas de Centros (duplicados, fechas, departamentos raros, tipo, número, nombre visible).
- [x] Macheo de texto libre: pasan todos los casos de `test/fixtures/casos-macheo.json`.
- [x] `tools/usar-entorno.js` muestra un mensaje claro si `.clasp.<entorno>.json` tiene un error de formato JSON.

## Fase 3 — Sheet y catálogo (v0.3.0)

- [ ] `Catalogo.js`: menú "Autodiagnóstico → Actualizar catálogo" que lee Universo original y regenera Centros con `nucleo.js`.
- [ ] Menú "Autodiagnóstico → Preparar planilla": crea las pestañas que falten, con encabezados y formato texto en las columnas libres.
- [ ] Carga inicial de Textos y Config desde `docs/INSTRUMENTO.md` y `docs/ARQUITECTURA.md`.
- [ ] Probar con una copia del Universo real **solo en la Sheet de prueba**.

## Fase 4 — Web app (v0.4.0)

- [ ] `obtenerDatosIniciales` y `guardarRespuesta` según `docs/ARQUITECTURA.md`.
- [ ] Bloqueo de escritura, límites de envío, campo trampa, tiempo mínimo.
- [ ] Página: adaptar `docs/prototipo/prototipo.html` a parciales de HtmlService, sin catálogo incrustado, con textos de la Sheet.
- [ ] Decidir y aplicar cómo se comparte la lógica del buscador con el navegador (ver `docs/ARQUITECTURA.md`).
- [ ] Versión visible en el pie.
- [ ] Toda fila que se escriba en Respuestas pasa por `protegerFormula_` (nombre, correo, centro, etc.). Decidir con la prueba de la sección 9 si alcanza el formato "Texto sin formato" o si además va el apóstrofo, porque juntos el apóstrofo se vería literal.
- [ ] Límites por cédula sobre la forma de 8 dígitos que devuelve `validarEnvio_`; para el límite de mails por dirección, contar el correo sin la parte `+...`. Sumar un tope global de mails por hora y por día.
- [ ] `guardarRespuesta` descarta (sin aviso) por campo trampa y por tiempo mínimo; `validarEnvio_` no los mira.
- [ ] `repararLocalidad_` con objetos `Date` depende de la zona horaria: confirmar que la Sheet y `appsscript.json` usan la misma. Avisar de los centros sin localidad fuera de Montevideo, porque no se podrían elegir.
- [ ] Decidir cuándo se usa `machearCentro_` (hoy solo ayuda a revisar los "No encuentro mi centro").

## Fase 5 — PDF y mail (v0.5.0)

- [ ] Perfil en PDF con la identidad visual.
- [ ] Envío por mail, con el límite por dirección y registro en `mail_enviado`.
- [ ] Manejo de la cuota diaria agotada.

## Fase 6 — Auditoría (v0.9.0)

- [ ] `auditor-seguridad` recorre `docs/SEGURIDAD.md` completo.
- [ ] Pruebas de la sección 9 hechas a mano en el proyecto de prueba.
- [ ] Logo y tipografía oficiales, si ya están.

## Fase 7 — Piloto (v1.0.0)

- [ ] Crear la Sheet y el proyecto de **producción**; primer despliegue.
- [ ] Piloto con un grupo chico de docentes; ajustar límites y textos.
- [ ] Publicación.

## Después de la versión 1

- Pantalla de consentimiento (con legal).
- Conectar la Sheet maestra de centros.
- Radar en el perfil y tablero de análisis, si hacen falta.
