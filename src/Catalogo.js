/**
 * Catalogo.js — Mantenimiento de la Sheet (fase 3).
 *
 * - Menú "Autodiagnóstico" en la Sheet (onOpen, que solo arma el menú).
 * - "Preparar planilla": crea las pestañas que falten con encabezados y formatos, y carga los textos y
 *   la configuración iniciales. No pisa nada de lo que ya existe.
 * - "Actualizar catálogo": Universo original → Centros, usando las funciones de nucleo.js.
 *   Escribe solo en Centros; nunca toca Respuestas.
 *
 * La lógica está en nucleo.js (se prueba con Node). Acá solo se habla con la Sheet.
 * Todas las funciones terminan en guion bajo, salvo onOpen.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Autodiagnóstico')
    .addItem('Preparar planilla', 'prepararPlanilla_')
    .addItem('Actualizar catálogo', 'actualizarCatalogo_')
    .addToUi();
}

function avisar_(titulo, mensaje) {
  const ui = SpreadsheetApp.getUi();
  ui.alert(titulo, mensaje, ui.ButtonSet.OK);
}

function confirmar_(titulo, mensaje) {
  const ui = SpreadsheetApp.getUi();
  return ui.alert(titulo, mensaje, ui.ButtonSet.YES_NO) === ui.Button.YES;
}

/** Devuelve { hoja, creada }: la pestaña con ese nombre, creándola si no existe. */
function hojaOCrear_(planilla, nombre) {
  const existente = planilla.getSheetByName(nombre);
  if (existente) return { hoja: existente, creada: false };
  return { hoja: planilla.insertSheet(nombre), creada: true };
}

/**
 * Escribe los encabezados si la pestaña está vacía. Si ya tiene otros distintos, no los toca.
 * Devuelve 'escritos', 'ok' o 'distintos'.
 */
function asegurarEncabezados_(hoja, encabezados) {
  if (hoja.getLastRow() === 0) {
    hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight('bold');
    hoja.setFrozenRows(1);
    return 'escritos';
  }
  const actuales = hoja.getRange(1, 1, 1, Math.max(encabezados.length, hoja.getLastColumn())).getValues()[0];
  return mismosEncabezados_(actuales, encabezados) ? 'ok' : 'distintos';
}

/** Agrega al final las filas iniciales cuya clave (primera columna) todavía no existe. Devuelve cuántas agregó. */
function agregarFaltantes_(hoja, filasIniciales) {
  const ultima = hoja.getLastRow();
  const claves = ultima > 1 ? hoja.getRange(2, 1, ultima - 1, 1).getValues().map(f => f[0]) : [];
  const faltan = filasQueFaltan_(claves, filasIniciales);
  if (faltan.length > 0) hoja.getRange(ultima + 1, 1, faltan.length, faltan[0].length).setValues(faltan);
  return faltan.length;
}

/** Menú: crea las pestañas que falten, con encabezados y formatos, y carga Textos y Config iniciales. */
function prepararPlanilla_() {
  const planilla = SpreadsheetApp.getActiveSpreadsheet();
  const informe = [];

  const universo = hojaOCrear_(planilla, PESTANAS_.universo);
  informe.push(universo.creada
    ? PESTANAS_.universo + ': creada vacía (pegá ahí la lista oficial, con su fila de encabezados).'
    : PESTANAS_.universo + ': ya existía, no se tocó.');

  const centros = hojaOCrear_(planilla, PESTANAS_.centros);
  informe.push(PESTANAS_.centros + ': ' + describirEncabezados_(asegurarEncabezados_(centros.hoja, COLUMNAS_CENTROS_), centros.creada));

  const textos = hojaOCrear_(planilla, PESTANAS_.textos);
  const estadoTextos = asegurarEncabezados_(textos.hoja, ENCABEZADOS_TEXTOS_);
  if (estadoTextos === 'distintos') {
    informe.push(PESTANAS_.textos + ': los encabezados no son los esperados (clave, texto); no se agregó nada.');
  } else {
    const filas = Object.keys(TEXTOS_INICIALES_).map(clave => [clave, TEXTOS_INICIALES_[clave]]);
    const agregados = agregarFaltantes_(textos.hoja, filas);
    textos.hoja.getRange(1, 2, textos.hoja.getMaxRows(), 1).setNumberFormat('@');
    informe.push(PESTANAS_.textos + ': ' + agregados + ' textos agregados' + (agregados < filas.length ? ' (los demás ya estaban y no se tocaron).' : '.'));
  }

  const config = hojaOCrear_(planilla, PESTANAS_.config);
  const estadoConfig = asegurarEncabezados_(config.hoja, ENCABEZADOS_CONFIG_);
  if (estadoConfig === 'distintos') {
    informe.push(PESTANAS_.config + ': los encabezados no son los esperados (clave, valor, descripcion); no se agregó nada.');
  } else {
    const agregadas = agregarFaltantes_(config.hoja, CONFIG_INICIAL_);
    informe.push(PESTANAS_.config + ': ' + agregadas + ' parámetros agregados' + (agregadas < CONFIG_INICIAL_.length ? ' (los demás ya estaban y no se tocaron).' : '.'));
  }

  const respuestas = hojaOCrear_(planilla, PESTANAS_.respuestas);
  const estadoRespuestas = asegurarEncabezados_(respuestas.hoja, ENCABEZADOS_RESPUESTAS_);
  if (estadoRespuestas === 'distintos') {
    informe.push(PESTANAS_.respuestas + ': los encabezados no son los esperados; no se cambió el formato de las columnas.');
  } else {
    for (const columna of COLUMNAS_TEXTO_RESPUESTAS_) {
      const posicion = ENCABEZADOS_RESPUESTAS_.indexOf(columna) + 1;
      respuestas.hoja.getRange(1, posicion, respuestas.hoja.getMaxRows(), 1).setNumberFormat('@');
    }
    informe.push(PESTANAS_.respuestas + ': ' + describirEncabezados_(estadoRespuestas, respuestas.creada) + ' Columnas de texto libre con formato "Texto sin formato".');
  }

  avisar_('Planilla preparada', informe.join('\n'));
}

function describirEncabezados_(estado, creada) {
  if (estado === 'escritos') return (creada ? 'creada' : 'estaba vacía') + ', con sus encabezados.';
  if (estado === 'ok') return 'ya estaba lista, no se tocó.';
  return 'ya tenía otros encabezados; no se tocó (revisala a mano).';
}

/** Menú: lee Universo original, lo limpia y reescribe la pestaña Centros. No toca ninguna otra. */
function actualizarCatalogo_() {
  const planilla = SpreadsheetApp.getActiveSpreadsheet();
  const hojaUniverso = planilla.getSheetByName(PESTANAS_.universo);
  if (!hojaUniverso || hojaUniverso.getLastRow() < 2) {
    avisar_('No se actualizó el catálogo', 'La pestaña "' + PESTANAS_.universo + '" está vacía o no existe. Pegá ahí la lista oficial de centros y volvé a intentar. Centros quedó como estaba.');
    return;
  }
  const lectura = filasDeUniverso_(hojaUniverso.getDataRange().getValues());
  if (!lectura.ok) {
    avisar_('No se actualizó el catálogo', 'En "' + PESTANAS_.universo + '" no se encontraron las columnas: ' + lectura.faltan.join(', ') + '. Centros quedó como estaba.');
    return;
  }
  const resultado = limpiarUniverso_(lectura.filas);
  if (resultado.centros.length === 0) {
    avisar_('No se actualizó el catálogo', 'Después de limpiar no quedó ningún centro, así que no se borró nada. ' + resumenLimpieza_(resultado));
    return;
  }
  if (!confirmar_('Actualizar catálogo', 'Se va a reemplazar todo el contenido de la pestaña "' + PESTANAS_.centros + '" con ' +
      resultado.centros.length + ' centros. Respuestas no se toca. ¿Seguir?')) {
    return;
  }

  const centros = hojaOCrear_(planilla, PESTANAS_.centros).hoja;
  const filas = [COLUMNAS_CENTROS_].concat(resultado.centros.map(centroAFila_));
  centros.clearContents();
  centros.getRange(1, 1, filas.length, COLUMNAS_CENTROS_.length).setValues(filas);
  centros.getRange(1, 1, 1, COLUMNAS_CENTROS_.length).setFontWeight('bold');
  centros.setFrozenRows(1);

  avisar_('Catálogo actualizado', resumenLimpieza_(resultado));
}
