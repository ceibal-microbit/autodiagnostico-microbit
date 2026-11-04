/**
 * Codigo.js — Entrada de la web app y funciones públicas.
 *
 * Públicas (las únicas que el navegador puede llamar): doGet, obtenerDatosIniciales,
 * guardarRespuesta. onOpen es pública porque Google la exige con ese nombre para el menú;
 * solo arma el menú. Toda otra función termina en guion bajo.
 *
 * La lógica está en nucleo.js (se prueba con Node). Acá solo se habla con la Sheet.
 * El servidor no confía en el navegador: valida todo y recalcula el perfil.
 */

// Mensaje único ante cualquier rechazo: no dice qué falló ni si una cédula ya respondió (docs/SEGURIDAD.md).
const MENSAJE_RECHAZO_ = 'No pudimos guardar tu respuesta. Intentá más tarde.';
// Filas de Respuestas que se revisan para los topes: alcanza de sobra para el último día.
const FILAS_A_REVISAR_ = 8000;
// Columnas de Respuestas que hacen falta para los topes: de fecha_hora (1) a cedula (5).
const COLUMNAS_A_REVISAR_ = 5;

function doGet() {
  const plantilla = HtmlService.createTemplateFromFile('index');
  plantilla.version = VERSION;
  return plantilla.evaluate()
    .setTitle('Autodiagnóstico docente micro:bit')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Centros, textos y versión para la página (contrato en docs/ARQUITECTURA.md).
 * `ahora` es la hora del servidor: la página la devuelve como abiertoEn.
 * Si algo falla devuelve { error: true }, sin detalles internos.
 */
function obtenerDatosIniciales() {
  try {
    const planilla = SpreadsheetApp.getActiveSpreadsheet();
    const centros = leerCentros_(planilla);
    if (centros.length === 0) throw fallaDeConfiguracion_('La pestaña Centros está vacía o tiene otros encabezados');
    return {
      version: VERSION,
      versionInstrumento: VERSION_INSTRUMENTO,
      ahora: Date.now(),
      centros: centrosParaNavegador_(centros),
      textos: textosParaNavegador_(clavesDeFilas_(leerPestana_(planilla, PESTANAS_.textos))),
    };
  } catch (e) {
    console.error('obtenerDatosIniciales: ' + textoParaRegistro_(e));
    return { error: true };
  }
}

/** Valida, guarda y devuelve el perfil (contrato en docs/ARQUITECTURA.md). Nunca muestra detalles internos. */
function guardarRespuesta(envio) {
  try {
    return procesarEnvio_(envio);
  } catch (e) {
    console.error('guardarRespuesta: ' + textoParaRegistro_(e));
    return { ok: false, mensaje: MENSAJE_RECHAZO_ };
  }
}

function procesarEnvio_(envio) {
  const planilla = SpreadsheetApp.getActiveSpreadsheet();
  const validacion = validarEnvio_(envio, leerCentros_(planilla));
  if (!validacion.ok) {
    console.warn('Envío rechazado por el campo: ' + validacion.campo);
    return { ok: false, mensaje: MENSAJE_RECHAZO_ };
  }
  const datos = validacion.datos;
  const config = clavesDeFilas_(leerPestana_(planilla, PESTANAS_.config));
  const respuestaOk = { ok: true, perfil: { dimensiones: datos.perfil.dimensiones, proximoPaso: datos.perfil.proximoPaso, mailEnviado: false } };

  // Un robot no se entera de que lo detectamos: ve su perfil, pero no se guarda nada.
  if (envioDescartado_(envio, Date.now(), topeDeConfig_(config, 'segundos_minimos'))) {
    console.warn('Envío descartado por el campo trampa o el tiempo mínimo');
    return respuestaOk;
  }

  const bloqueo = LockService.getScriptLock();
  if (!bloqueo.tryLock(10000)) {
    console.warn('Envío rechazado: no se pudo tomar el bloqueo');
    return { ok: false, mensaje: MENSAJE_RECHAZO_ };
  }
  try {
    const hoja = hojaDeRespuestas_(planilla);
    const ahora = new Date();
    const limites = revisarLimites_(filasParaLimites_(hoja), datos.cedula, ahora.getTime(), {
      max_envios_cedula_dia: topeDeConfig_(config, 'max_envios_cedula_dia'),
      max_envios_hora: topeDeConfig_(config, 'max_envios_hora'),
    });
    if (!limites.ok) {
      console.warn('Envío rechazado por el tope: ' + limites.motivo);
      return { ok: false, mensaje: MENSAJE_RECHAZO_ };
    }
    // En esta fase no se manda ningún mail (docs/PLAN.md).
    hoja.appendRow(filaDeRespuesta_(datos, ahora, 'no'));
    // Apps Script puede demorar la escritura: sin esto, el envío siguiente contaría los topes sin ver esta fila.
    SpreadsheetApp.flush();
  } finally {
    bloqueo.releaseLock();
  }
  return respuestaOk;
}

/** Un problema de la planilla que se puede registrar tal cual, porque lo escribimos nosotros y no lleva datos personales. */
function fallaDeConfiguracion_(mensaje) {
  const error = new Error(mensaje);
  error.esDeConfiguracion = true;
  return error;
}

/** Qué queda en Ejecuciones. De los errores de Google solo el tipo: no sabemos qué datos podría traer su mensaje. */
function textoParaRegistro_(error) {
  return error && error.esDeConfiguracion ? error.message : 'error interno (' + (error && error.name) + ')';
}

function leerPestana_(planilla, nombre) {
  const hoja = planilla.getSheetByName(nombre);
  if (!hoja) throw fallaDeConfiguracion_('Falta la pestaña ' + nombre);
  return hoja.getDataRange().getValues();
}

function leerCentros_(planilla) {
  return centrosDeFilas_(leerPestana_(planilla, PESTANAS_.centros));
}

/** La pestaña Respuestas, solo si sus encabezados son los esperados: así una fila nunca queda corrida de columna. */
function hojaDeRespuestas_(planilla) {
  const hoja = planilla.getSheetByName(PESTANAS_.respuestas);
  if (!hoja) throw fallaDeConfiguracion_('Falta la pestaña ' + PESTANAS_.respuestas);
  const encabezados = hoja.getRange(1, 1, 1, ENCABEZADOS_RESPUESTAS_.length).getValues()[0];
  if (!mismosEncabezados_(encabezados, ENCABEZADOS_RESPUESTAS_)) throw fallaDeConfiguracion_('La pestaña Respuestas tiene otros encabezados');
  return hoja;
}

/** Fecha y cédula de las últimas filas de Respuestas. */
function filasParaLimites_(hoja) {
  const ultima = hoja.getLastRow();
  if (ultima < 2) return [];
  const desde = Math.max(2, ultima - FILAS_A_REVISAR_ + 1);
  return hoja.getRange(desde, 1, ultima - desde + 1, COLUMNAS_A_REVISAR_).getValues().map(fila => [fila[0], fila[4]]);
}

/** Incluye un parcial HTML dentro de una plantilla: <?!= incluir_('estilos') ?> */
function incluir_(nombre) {
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}
