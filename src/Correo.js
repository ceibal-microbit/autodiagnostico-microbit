/**
 * Correo.js — PDF del perfil y envío por mail (fase 5).
 *
 * - El PDF se arma desde HTML con Utilities.newBlob(html, 'text/html').getAs('application/pdf').
 * - Todo texto del docente se escapa antes de insertarlo.
 * - El mail no incluye la cédula. Asunto y remitente fijos.
 *
 * Todas las funciones terminan en guion bajo.
 */
