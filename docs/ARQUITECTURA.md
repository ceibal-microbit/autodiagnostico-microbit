# Arquitectura

## Piezas

| Pieza | Dónde vive | Qué hace |
| --- | --- | --- |
| Página (`index.html` y parciales) | Navegador del docente | Pantallas, buscador de centros, validación amigable, muestra el perfil |
| Código del servidor (`src/*.js`) | Apps Script, como la cuenta dedicada | Entrega la página y los datos, valida, calcula, guarda, genera PDF, manda mail |
| Google Sheet | Unidad compartida del programa | Catálogo, textos, configuración y respuestas |

El script está **vinculado** a la Sheet. Hay dos copias completas (Sheet + script): **prueba** y **producción**.

## Flujo

1. El docente abre el link de la web app → `doGet()` devuelve la página.
2. La página llama a `obtenerDatosIniciales()` → recibe centros, textos y versión. La búsqueda de centros ocurre en el navegador, sin más llamadas.
3. El docente completa y envía → la página llama a `guardarRespuesta(envio)`.
4. El servidor valida, aplica límites, recalcula, escribe la fila (con bloqueo), genera el PDF y manda el mail.
5. Devuelve el perfil → la página lo muestra.

La página llama al servidor con `google.script.run`. Solo hay dos funciones públicas; todo lo demás termina en guion bajo.

## Contratos de las funciones públicas

### `obtenerDatosIniciales()`

Sin parámetros. Devuelve:

```js
{
  version: "0.1.0",            // versión de la app
  versionInstrumento: "2026.1",
  centros: [                   // de la pestaña Centros, solo estas columnas
    [codigo, nombreVisible, subsistema, departamento, localidad, tipo, numero, nombreNormalizado]
  ],
  textos: { /* clave → texto, de la pestaña Textos */ }
}
```

No devuelve nada de la pestaña Respuestas ni columnas del Universo que el buscador no usa (teléfonos, mails, matrícula…). Puede guardarse en `CacheService` en partes de menos de 100 KB para acelerar la carga.

### `guardarRespuesta(envio)`

Recibe:

```js
{
  nombre, cedula, email,
  subsistema, departamento, localidad,      // localidad vacía en Montevideo
  centroCodigo,                             // número, o null si eligió "No encuentro mi centro"
  centroTexto,                              // lo que escribió el docente
  ctx: [n, n, n],                           // opción elegida en cada pregunta de contexto (1..k)
  r: [n × 15],                              // respuestas 1..5, en el orden de docs/INSTRUMENTO.md
  abiertoEn,                                // milisegundos en que se abrió la página
  trampa                                    // campo oculto; debe venir vacío
}
```

Devuelve `{ ok: true, perfil }` o `{ ok: false, mensaje }`, con un mensaje genérico y sin detalles internos. El perfil es:

```js
{
  dimensiones: [{ id: "d1", suma: 11, promedio: 3.67, nivel: "d" }, …],
  proximoPaso: ["d2"],                     // ids; vacío si todas son consolidadas
  mailEnviado: true
}
```

Las reglas de validación están en `docs/SEGURIDAD.md`, sección 3.

## Pestañas de la Sheet

| Pestaña | Quién la escribe | Contenido |
| --- | --- | --- |
| Universo original | El equipo, pegando la lista oficial | Tal cual viene de la planilla de centros |
| Centros | El menú "Actualizar catálogo" | Catálogo limpio para el buscador |
| Textos | El equipo | Textos de pantallas y devoluciones (clave → texto) |
| Config | El equipo | Límites y parámetros (clave → valor) |
| Respuestas | Solo la web app | Una fila por envío |

### Centros

`codigo` · `nombre` · `nombre_visible` · `subsistema` · `departamento` · `localidad` · `tipo` (`esc`, `jar`, `lic`, `utu`, `ifd`, `cerp`, `anexo`, `otro`) · `numero` · `nombre_normalizado` · `observacion` (por ejemplo, "departamento fuera de Uruguay").

### Textos

Claves sugeridas: `d1_observa`, `d1_f_texto`, `d1_f_rec`, `d1_d_texto`, …, `d5_c_rec`, `cierre_titulo`, `cierre_1`, `cierre_2`, `intro_1`, `intro_2`. La carga inicial sale de `docs/INSTRUMENTO.md`. Las afirmaciones y preguntas de contexto pueden quedar en el código en la versión 1, porque cambiarlas cambia la versión del instrumento.

**Cómo se cargan y se cambian los textos.** La app lee siempre la pestaña Textos de la Sheet. La carga inicial sale de `src/textos.js`, que se genera desde `docs/INSTRUMENTO.md` con `node tools/generar-textos.js` (un test avisa si están desfasados). "Autodiagnóstico → Preparar planilla" solo agrega las claves que faltan y nunca pisa lo que el equipo editó. Si el equipo cambia un texto en la Sheet y quiere que quede definitivo, también hay que actualizar `docs/INSTRUMENTO.md` y regenerar `src/textos.js`; si no, una Sheet nueva volvería al texto original.

### Config

`max_envios_cedula_dia` (3) · `max_mails_destino_dia` (1) · `max_envios_hora` (a definir) · `segundos_minimos` (60) · `correo_equipo_alertas`.

### Respuestas

`fecha_hora` · `version_app` · `version_instrumento` · `nombre` · `cedula` · `email` · `subsistema` · `departamento` · `localidad` · `centro_texto` · `centro_codigo` · `origen_macheo` (`elegido por docente`, `pendiente de revisión`, `automático`, `revisado manualmente`) · `ctx_1`…`ctx_3` · `d1_i1`…`d5_i3` · `d1_suma`…`d5_suma` · `d1_nivel`…`d5_nivel` · `mail_enviado` (`sí`, `no`, `límite`).

Las columnas de texto libre (`nombre`, `email`, `centro_texto`) tienen formato "Texto sin formato".

## Permisos (`src/appsscript.json`)

| Scope | Para qué |
| --- | --- |
| `spreadsheets.currentonly` | Leer y escribir **solo** la Sheet vinculada |
| `script.send_mail` | Mandar el perfil por mail |
| `script.container.ui` | Agregar el menú a la Sheet |

El PDF se genera con `Utilities.newBlob(html, 'text/html').getAs('application/pdf')`, que no requiere Drive. Si en la fase 5 resultara necesario un permiso más, se consulta antes de agregarlo.

Configuración de la web app: ejecutar como quien implementa (`USER_DEPLOYING`) y acceso para cualquier persona sin iniciar sesión (`ANYONE_ANONYMOUS`).

## La página

- Se arma con `HtmlService.createTemplateFromFile('index').evaluate()`, que incluye los parciales (`estilos.html`, `app.html`) con una función `incluir_()`.
- Agrega la etiqueta `viewport`, el título y el ícono desde `doGet`.
- Toma como base `docs/prototipo/prototipo.html`, quitándole el catálogo incrustado: los centros llegan de `obtenerDatosIniciales`.
- **Lógica compartida con el navegador** (normalizar texto y buscar centros): Apps Script no puede servir un `.js` al navegador, así que va en `src/buscador.html` dentro de un `<script>`. Los tests de Node leen ese archivo, extraen el `<script>` y lo ejecutan con `vm`. A decidir en la fase 4.

## Límites conocidos de Apps Script

Hay que confirmarlos en la documentación de Google:
- Unos 6 minutos por ejecución.
- Unas 30 ejecuciones simultáneas.
- Una cuota diaria de destinatarios de mail según el tipo de cuenta: del orden de 100 en Gmail común y de 1.500 en Workspace.
