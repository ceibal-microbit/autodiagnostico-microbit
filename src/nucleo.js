/**
 * nucleo.js — Lógica pura del autodiagnóstico.
 *
 * Reglas (ver CLAUDE.md):
 * - Sin servicios de Google (SpreadsheetApp, MailApp, etc.): todo se testea con Node.
 * - Sin require/import/export: en Apps Script todos los archivos comparten el espacio global.
 * - El bloque final exporta las funciones para los tests de Node; en Apps Script se ignora.
 */

const VERSION = '0.1.0';
const VERSION_INSTRUMENTO = '2026.1';

// Fase 2 (docs/PLAN.md): puntajes y niveles, cédula, correo, validación de envíos,
// protección contra fórmulas, normalización, limpieza del catálogo y macheo.

if (typeof module !== 'undefined') {
  module.exports = { VERSION, VERSION_INSTRUMENTO };
}
