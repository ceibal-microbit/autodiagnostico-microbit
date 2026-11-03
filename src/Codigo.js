/**
 * Codigo.js — Entrada de la web app y funciones públicas.
 *
 * Públicas (las únicas que el navegador puede llamar): doGet, obtenerDatosIniciales,
 * guardarRespuesta. onOpen es pública porque Google la exige con ese nombre para el menú;
 * solo arma el menú. Toda otra función termina en guion bajo.
 */

function doGet() {
  const plantilla = HtmlService.createTemplateFromFile('index');
  plantilla.version = VERSION;
  // Verificación de la fase 1: la web app puede leer la Sheet vinculada.
  plantilla.planilla = SpreadsheetApp.getActiveSpreadsheet().getName();
  return plantilla.evaluate()
    .setTitle('Autodiagnóstico docente micro:bit')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Fase 4: devuelve centros, textos y versión (contrato en docs/ARQUITECTURA.md). */
function obtenerDatosIniciales() {
  return { version: VERSION, versionInstrumento: VERSION_INSTRUMENTO, centros: [], textos: {} };
}

/** Fase 4: valida, guarda y devuelve el perfil (contrato en docs/ARQUITECTURA.md). */
function guardarRespuesta(envio) {
  return { ok: false, mensaje: 'Todavía no disponible.' };
}

/** Incluye un parcial HTML dentro de una plantilla: <?!= incluir_('estilos') ?> */
function incluir_(nombre) {
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}
