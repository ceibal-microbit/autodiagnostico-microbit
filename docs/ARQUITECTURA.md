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
4. El servidor valida, recalcula, aplica límites y escribe la fila (con bloqueo). Si es un reintento reciente o la cédula ya llegó a su límite del día, devuelve el perfil sin escribir.
5. Devuelve el perfil → la página lo muestra, con dos botones: descargar en PDF y enviar por mail.
6. Si el docente toca un botón, la página llama a `descargarPerfil(envio)` o a `enviarPerfilPorMail(envio)`.

La página llama al servidor con `google.script.run`. Solo hay cuatro funciones públicas; todo lo demás termina en guion bajo.

Mientras el docente completa el formulario, el avance se guarda en `sessionStorage`: queda solo en esa pestaña del navegador y se borra al enviar, al cerrarla o si tiene más de 6 horas. Sirve para no perder las respuestas si el celular recarga la página.

## Contratos de las funciones públicas

### `obtenerDatosIniciales()`

Sin parámetros. Devuelve:

```js
{
  version: "0.1.0",            // versión de la app
  versionInstrumento: "2026.1",
  ahora: 1793810493481,        // hora del servidor; la página la devuelve como abiertoEn
  centros: [                   // de la pestaña Centros, solo estas columnas
    [codigo, nombreVisible, subsistema, departamento, localidad, tipo, numero, nombreNormalizado]
  ],
  textos: { /* clave → texto, de la pestaña Textos */ }
}
```

Si algo falla devuelve `{ error: true }`, sin detalles. No devuelve nada de la pestaña Respuestas ni columnas del Universo que el buscador no usa (teléfonos, mails, matrícula…), ni los centros de departamentos fuera de Uruguay.

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
  abiertoEn,                                // hora del servidor al abrir la página (el `ahora` de arriba), no la del celular
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

### `descargarPerfil(envio)`

Recibe el mismo `envio`, lo valida de nuevo y recalcula el perfil. Devuelve `{ ok: true, pdf, nombreArchivo }`, con el PDF en base64, o `{ ok: false, mensaje }`. No lee Respuestas ni escribe nada.

### `enviarPerfilPorMail(envio)`

Recibe el mismo `envio` y lo valida de nuevo. Devuelve siempre `{ ok: true, mensaje }` con el mismo texto, salvo un envío inválido, que devuelve `{ ok: false, mensaje }`. Con el bloqueo tomado, busca la fila de hoy con esa cédula y ese correo; si existe y lo permiten `modo_mail` y los topes, manda el mail y actualiza `mail_enviado` en esa fila.

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

`max_envios_cedula_dia` (3) · `max_mails_destino_dia` (1) · `max_envios_hora` (20 mientras se prueba) · `max_mails_hora` (10) · `max_mails_dia` (20) · `segundos_minimos` (60) · `correo_equipo_alertas` · `modo_mail` (`apagado`) · `correos_de_prueba`.

Columnas de la pestaña: `clave` · `valor` · `descripcion`. "Preparar planilla" las carga con esos valores iniciales; `correo_equipo_alertas` y `correos_de_prueba` salen vacíos hasta que el equipo los complete. Si `max_envios_hora` o los topes de mails están vacíos, el servidor usa los valores mínimos de prueba, nunca "sin límite". `modo_mail`, `correos_de_prueba` y `correo_equipo_alertas` se usan desde la fase 5.

### Respuestas

`fecha_hora` · `version_app` · `version_instrumento` · `nombre` · `cedula` · `email` · `subsistema` · `departamento` · `localidad` · `centro_texto` · `centro_codigo` · `origen_macheo` (`elegido por docente`, `pendiente de revisión`, `automático`, `revisado manualmente`) · `ctx_1`…`ctx_3` · `d1_i1`…`d5_i3` · `d1_suma`…`d5_suma` · `d1_nivel`…`d5_nivel` · `mail_enviado` (`no` al guardar; `sí` o `límite` según lo que pase si el docente pide el mail).

Las columnas de texto libre (`nombre`, `cedula`, `email`, `localidad`, `centro_texto`) y las de versión (`version_app`, `version_instrumento`) tienen formato "Texto sin formato" (la cédula también, para no perder el cero inicial; se guarda siempre con 8 dígitos). El correo se guarda en minúsculas.

## Permisos (`src/appsscript.json`)

| Scope | Para qué |
| --- | --- |
| `spreadsheets.currentonly` | Leer y escribir **solo** la Sheet vinculada |
| `script.send_mail` | Mandar el perfil por mail |
| `script.container.ui` | Agregar el menú a la Sheet |

El PDF se genera con `Utilities.newBlob(html, 'text/html').getAs('application/pdf')`, que no requiere Drive. Si en la fase 5 resultara necesario un permiso más, se consulta antes de agregarlo.

Configuración de la web app: ejecutar como quien implementa (`USER_DEPLOYING`) y acceso para cualquier persona sin iniciar sesión (`ANYONE_ANONYMOUS`).

## La página

- Se arma con `HtmlService.createTemplateFromFile('index').evaluate()`, que incluye los parciales (`estilos.html`, `buscador.html`, `app.html`) con una función `incluir_()`.
- `app.html` arma las pantallas creando elementos y agregando el contenido como texto; ningún archivo interpreta como HTML lo que viene del docente o de la Sheet.
- Agrega la etiqueta `viewport` y el título desde `doGet`. El ícono queda para cuando esté el logo oficial.
- Toma como base `docs/prototipo/prototipo.html`, quitándole el catálogo incrustado y lo que es solo del prototipo: los centros llegan de `obtenerDatosIniciales`.
- Se diseña primero para celular: toda zona tocable mide al menos 44 px y los campos usan 16 px o más, para que el iPhone no haga zoom.
- **Lógica compartida con el navegador** (normalizar texto y buscar centros): Apps Script no puede servir un `.js` al navegador, así que va en `src/buscador.html` dentro de un `<script>`. Los tests de Node leen ese archivo, extraen el `<script>` y lo ejecutan con `vm`. Las reglas para normalizar quedan en dos lugares (`nucleo.js` y `buscador.html`), así que un test les pasa los mismos textos a las dos versiones y falla si dan resultados distintos.

## Límites conocidos de Apps Script

Según la documentación de Google (consultada el 04/11/2026):
- Unos 6 minutos por ejecución.
- 30 ejecuciones simultáneas por usuario.
- Una cuota diaria de destinatarios de mail: 100 en Gmail común y 1.500 en Workspace (la cuenta dedicada es Workspace paga). Se renueva 24 horas después del primer envío, no a una hora fija.
