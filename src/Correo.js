/**
 * Correo.js — PDF del perfil y envío por mail (fase 5).
 *
 * - El PDF se arma desde HTML con Utilities.newBlob(html, 'text/html').getAs('application/pdf').
 * - Todo texto del docente se escapa antes de insertarlo (armarHtmlPerfil_ en nucleo.js).
 * - El mail no incluye la cédula. Asunto y remitente fijos. (Fase 5b: todavía no se manda ningún mail.)
 *
 * Pública: descargarPerfil. Todas las demás funciones terminan en guion bajo.
 */

const MENSAJE_PDF_ERROR_ = 'No pudimos preparar el PDF. Intentá más tarde.';

/**
 * Devuelve el perfil en PDF (contrato en docs/ARQUITECTURA.md). Valida el envío de nuevo y recalcula el perfil:
 * no lee Respuestas ni escribe nada, y no depende de que el envío se haya guardado.
 */
function descargarPerfil(envio) {
  try {
    const planilla = SpreadsheetApp.getActiveSpreadsheet();
    const centros = leerCentros_(planilla);
    const validacion = validarEnvio_(envio, centros);
    if (!validacion.ok) {
      console.warn('PDF rechazado por el campo: ' + validacion.campo);
      return { ok: false, mensaje: MENSAJE_PDF_ERROR_ };
    }
    const textos = clavesDeFilas_(leerPestana_(planilla, PESTANAS_.textos));
    return { ok: true, pdf: generarPdfPerfil_(validacion.datos, centros, textos), nombreArchivo: NOMBRE_ARCHIVO_PERFIL_ };
  } catch (e) {
    console.error('descargarPerfil: ' + textoParaRegistro_(e));
    return { ok: false, mensaje: MENSAJE_PDF_ERROR_ };
  }
}

/** El PDF del perfil, en base64 para que viaje hasta el navegador. */
function generarPdfPerfil_(datos, centros, textos) {
  const html = armarHtmlPerfil_(datos, nombreDeCentroParaPerfil_(datos, centros), textos, {
    fecha: Utilities.formatDate(new Date(), 'America/Montevideo', 'dd/MM/yyyy'),
    version: VERSION,
  });
  const pdf = Utilities.newBlob(html, 'text/html', 'perfil.html').getAs('application/pdf');
  return Utilities.base64Encode(pdf.getBytes());
}
