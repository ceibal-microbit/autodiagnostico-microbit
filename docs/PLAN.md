# Plan de trabajo

Una fase por vez. Cada fase cierra con: tests en verde, revisión de `revisor` y `auditor-seguridad`, PR mergeado, versión etiquetada y, cuando corresponde, despliegue al proyecto de prueba.

## Fase 1 — Preparación (v0.1.0)

Objetivo: el circuito completo funciona de punta a punta con una página mínima.

- [x] Crear el repo privado `ceibal-microbit/autodiagnostico-microbit` y subir este kit.
- [x] Confirmar que `npm test` y el CI de GitHub pasan.
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

- [x] `Catalogo.js`: menú "Autodiagnóstico → Actualizar catálogo" que lee Universo original y regenera Centros con `nucleo.js`.
- [x] Menú "Autodiagnóstico → Preparar planilla": crea las pestañas que falten, con encabezados y formato texto en las columnas libres.
- [x] Carga inicial de Textos y Config desde `docs/INSTRUMENTO.md` y `docs/ARQUITECTURA.md`.
- [x] Probar con una copia del Universo real **solo en la Sheet de prueba**. Hecho a mano: Preparar planilla, Actualizar catálogo (4047 centros, 157 repetidas sacadas, 2 descartadas por no tener departamento, 7 con observaciones), el control de filas cuadra, el menú ejecuta funciones con guion bajo y se revisaron las observaciones. **Quedaron sin probar a mano** (solo cubiertas por el simulador de tests): repetir Actualizar catálogo, una fila con nombre `=1+1`, el aviso de lista incompleta y el formato de texto de Respuestas pasadas las 1000 filas. Pasaron a la fase 6.

## Fase 4 — Web app (v0.4.0)

- [x] `obtenerDatosIniciales` y `guardarRespuesta` según `docs/ARQUITECTURA.md`.
- [x] Bloqueo de escritura, límites de envío, campo trampa, tiempo mínimo.
- [x] Rehacer `docs/prototipo/prototipo.html` como formulario simple tipo Google Forms y pensado para celular (ver `docs/DECISIONES.md`).
- [x] Página: adaptar el prototipo a parciales de HtmlService, sin catálogo incrustado y sin lo que es solo del prototipo (franja violeta, perfil de ejemplo, tabla "para el equipo", botón de PDF), con textos de la Sheet.
- [x] Celular: la página aparece enseguida y avisa mientras cargan los centros; "Enviar" se bloquea al tocarlo para no duplicar la fila; si falla la conexión, no se pierde lo respondido; el botón "atrás" del celular no hace perder las respuestas; el avance se guarda en la pestaña.
- [x] Probar a mano con el link de la web app en un Android real, con datos móviles. Carga en unos 8 segundos, con la franja de Google arriba.
- [x] Mostrar solo los departamentos con centros del subsistema elegido; ocultar y rechazar los de fuera de Uruguay.
- [x] Ningún servicio de correo en el código de esta fase; un test lo controla.
- [x] Compartir la lógica del buscador con `src/buscador.html` y un test que compare sus resultados con `nucleo.js` (ver `docs/ARQUITECTURA.md`).
- [x] Versión visible en el pie.
- [x] Sumar a Config `max_mails_hora`, `max_mails_dia`, `modo_mail` y `correos_de_prueba`, con los valores mínimos de prueba. Si un tope está vacío, `guardarRespuesta` usa el mínimo en vez de no limitar. El aviso por superar el tope por hora queda en *Ejecuciones*; el mail al equipo llega en la fase 5.
- [x] Los textos de la pestaña Textos se muestran sin interpretar HTML (ver `docs/SEGURIDAD.md`, sección 6) y se saca de la página el nombre de la planilla.
- [x] Al leer Centros en `obtenerDatosIniciales`, quitar el apóstrofo que `protegerFormula_` puso delante de algún nombre.
- [x] Toda fila que se escriba en Respuestas pasa por `protegerFormula_` (nombre, correo, centro, etc.), junto con el formato "Texto sin formato", como pide `docs/SEGURIDAD.md`.
- [x] Probar en la Sheet de prueba un nombre que empieza con `=`: se ve como texto, y el apóstrofo queda solo en la barra de fórmulas. Se dejan las dos protecciones.
- [x] Probar en la Sheet de prueba la fila guardada, el reintento, el límite por cédula, el tiempo mínimo y "No encuentro mi centro". No salió ningún mail.
- [x] Límites por cédula sobre la forma de 8 dígitos que devuelve `validarEnvio_`. Pasado el límite se ve el perfil y no se guarda. Un reintento idéntico en 10 minutos no suma otra fila.
- [x] `guardarRespuesta` descarta (sin aviso) por campo trampa y por tiempo mínimo; `validarEnvio_` no los mira.
- [x] Avisar de los centros sin localidad fuera de Montevideo al actualizar el catálogo, porque no se podrían elegir.
- [x] `repararLocalidad_` con objetos `Date` depende de la zona horaria: la Sheet de prueba usa Montevideo, igual que `appsscript.json`.
- [x] `guardarRespuesta` no usa `machearCentro_`: los "No encuentro mi centro" se guardan como `pendiente de revisión`. El envío descartado por campo trampa o tiempo mínimo ve su perfil normal y no se guarda nada.

## Fase 5 — PDF y mail (v0.5.0)

- [ ] Perfil en PDF con la identidad visual, generado en el servidor. Botón "Descargar en PDF" en el perfil.
- [ ] Botón "Enviar por mail" en el perfil, que no excluye al de PDF. El mail sale solo si el docente lo pide.
- [ ] Cambiar la ayuda del correo: "Si querés, al terminar te mandamos tu perfil a este correo."
- [ ] Envío por mail detrás de la llave `modo_mail`, que viene en `apagado`, con el límite por dirección (contando el correo sin la parte `+...`), los topes globales de mails por hora y por día, y registro en `mail_enviado`. En las pruebas solo se usa `solo_lista` con correos propios.
- [ ] Aviso por mail al equipo al superar el tope por hora, también detrás de `modo_mail`. **Obligatorio antes de publicar:** sin esto, un script podría agotar el tope y trabar el formulario sin que nadie se entere.
- [ ] Un envío descartado, una cédula en su límite y un reintento tienen que recibir el mismo aviso al pedir el mail, y la respuesta no debe delatar si se guardó. Sacar `mailEnviado` del perfil, porque el mail ahora es a pedido.
- [ ] Decidir qué pasa si alguien corrige un correo mal escrito y repite las mismas respuestas en 10 minutos: el reintento no guarda otra fila, así que no habría una fila con el correo nuevo.
- [ ] El perfil se pierde si el docente recarga la página después de enviar: avisarlo junto a los botones de PDF y mail.
- [ ] Manejo de la cuota diaria agotada.

## Fase 6 — Auditoría (v0.9.0)

- [ ] `auditor-seguridad` recorre `docs/SEGURIDAD.md` completo, incluida la diferencia de tiempo de respuesta entre guardar y no guardar.
- [ ] Repetir en un iPhone real las pruebas en celular de la fase 4, sobre todo recuperar el avance y el botón "atrás".
- [ ] Exportar a CSV una fila con un nombre que empieza con `=` y abrirla en Excel.
- [ ] Definir qué dispara el plan B del captcha y cómo se activa.
- [x] Medir en el celular cuánto tarda en cargar el catálogo real: unos 8 segundos, con la franja de Google arriba.
- [ ] Pruebas de la sección 9 hechas a mano en el proyecto de prueba.
- [ ] Pruebas de la fase 3 que no se hicieron a mano: repetir "Actualizar catálogo" (mismo resultado), fila del Universo con nombre `=1+1` (cómo se ve el apóstrofo en Centros), aviso de "catálogo se achica mucho" con una lista incompleta, y formato de texto de Respuestas pasadas las 1000 filas.
- [ ] Logo y tipografía oficiales, si ya están.

## Fase 7 — Piloto (v1.0.0)

- [ ] Crear la Sheet y el proyecto de **producción**; primer despliegue. Confirmar que la Sheet use la zona horaria de Montevideo.
- [ ] Subir los topes de prueba en Config (referencia: 300 envíos por hora, 200 mails por hora, 1.200 por día) y pasar `modo_mail` a `activo`.
- [ ] QR para la publicación que se envía a los centros: generarlo recién con la URL definitiva y publicar siempre sobre la misma implementación, para que siga funcionando después de repartida.
- [ ] Piloto con un grupo chico de docentes; ajustar límites y textos.
- [ ] Publicación.

## Después de la versión 1

- Pantalla de consentimiento (con legal).
- Conectar la Sheet maestra de centros.
- Radar en el perfil y tablero de análisis, si hacen falta.
