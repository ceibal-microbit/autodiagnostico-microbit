const test = require('node:test');
const assert = require('node:assert');
const n = require('../src/nucleo.js');
const universo = require('./fixtures/universo-sintetico.json');

const resultado = n.limpiarUniverso_(universo.filas);
const porCodigo = codigo => resultado.centros.find(c => c.codigo === codigo);

test('una fila por Código Ceibal', () => {
  const codigos = resultado.centros.map(c => c.codigo);
  assert.strictEqual(codigos.length, new Set(codigos).size);
  assert.strictEqual(resultado.duplicadas, 2);
});

test('excluye las filas sin departamento y lo informa', () => {
  assert.strictEqual(porCodigo(90000032), undefined);
  assert.deepStrictEqual(resultado.descartadas, [{ codigo: 90000032, motivo: 'sin departamento' }]);
});

test('corrige las localidades que Excel convirtió en fecha', () => {
  assert.strictEqual(porCodigo(1103171).localidad, '18 de Mayo');
  assert.strictEqual(porCodigo(1108005).localidad, '25 de Mayo');
  assert.strictEqual(porCodigo(1114018).localidad, '19 de Abril');
  assert.match(porCodigo(1103171).observacion, /localidad corregida/);
  assert.ok(!resultado.centros.some(c => /^\d{4}-\d{2}-\d{2}/.test(c.localidad)));
});

test('repararLocalidad_ también entiende objetos Date y no toca textos normales', () => {
  assert.deepStrictEqual(n.repararLocalidad_(new Date(2026, 4, 18)), { texto: '18 de Mayo', corregida: true });
  assert.deepStrictEqual(n.repararLocalidad_('2026-05-25T00:00:00.000Z'), { texto: '25 de Mayo', corregida: true });
  assert.deepStrictEqual(n.repararLocalidad_('  Punta   Carretas '), { texto: 'Punta Carretas', corregida: false });
  assert.deepStrictEqual(n.repararLocalidad_(null), { texto: '', corregida: false });
  assert.deepStrictEqual(n.repararLocalidad_('2026-13-40 00:00:00'), { texto: '2026-13-40 00:00:00', corregida: false });
});

test('departamentos fuera de Uruguay quedan marcados para revisión', () => {
  assert.match(porCodigo(1101661).observacion, /fuera de Uruguay/);
  assert.match(porCodigo(90000031).observacion, /fuera de Uruguay/);
  assert.strictEqual(porCodigo(1101003).observacion, '');
});

test('los departamentos de Uruguay quedan con su nombre canónico', () => {
  assert.strictEqual(porCodigo(1101003).departamento, 'Montevideo');
  assert.strictEqual(porCodigo(1119091).departamento, 'Treinta y Tres');
  const r = n.limpiarUniverso_([{ 'Código Ceibal': 1, 'Nombre Dependencia': 'X', Rubro: 'DGES', Departamento: 'PAYSANDU' }]);
  assert.strictEqual(r.centros[0].departamento, 'Paysandú');
});

test('número: sale del código en escuelas y jardines públicos de DGEIP, y del nombre en el resto', () => {
  assert.strictEqual(porCodigo(1101026).numero, 26); // nombre propio: el número solo está en el código
  assert.strictEqual(porCodigo(1101300).numero, 300);
  assert.strictEqual(porCodigo(90000006).numero, 7); // liceo: del nombre
  assert.strictEqual(porCodigo(90000025).numero, 51);
  assert.strictEqual(porCodigo(90000007).numero, null); // el código 1201112 del nombre no es un número
  assert.strictEqual(porCodigo(90000021).numero, null); // "Dieciocho de Mayo"
  assert.strictEqual(porCodigo(90000026).numero, null); // "25 de Mayo" es una fecha, no un número
});

test('tipo: sale del nombre, no de "Tipo dependencia" (que tiene inconsistencias)', () => {
  assert.strictEqual(porCodigo(1101300).tipo, 'esc'); // figura como jardín público
  assert.strictEqual(porCodigo(1101003).tipo, 'esc');
  assert.strictEqual(porCodigo(1101245).tipo, 'jar');
  assert.strictEqual(porCodigo(90000006).tipo, 'lic');
  assert.strictEqual(porCodigo(90000022).tipo, 'utu'); // "Escuela técnica"
  assert.strictEqual(porCodigo(90000027).tipo, 'utu'); // "Escuela agraria"
  assert.strictEqual(porCodigo(90000001).tipo, 'anexo');
  assert.strictEqual(porCodigo(90000023).tipo, 'anexo'); // "Satélite UTU"
  assert.strictEqual(porCodigo(90000028).tipo, 'ifd');
  assert.strictEqual(porCodigo(90000029).tipo, 'cerp');
  assert.strictEqual(porCodigo(90000004).tipo, 'otro'); // inspección
  assert.strictEqual(porCodigo(1101026).tipo, 'esc'); // nombre propio: por "Tipo dependencia"
});

test('nombre visible: escuelas y jardines públicos con nombre propio llevan su número', () => {
  assert.strictEqual(porCodigo(1101035).nombre_visible, 'Escuela Nº 35 · República de Islandia');
  assert.strictEqual(porCodigo(1101003).nombre_visible, 'Escuela Nº 3 · Noruega');
  assert.strictEqual(porCodigo(1101026).nombre_visible, 'Escuela Nº 26 · Estrella del Sur');
  assert.strictEqual(porCodigo(1101012).nombre_visible, 'Escuela Nº 12');
  assert.strictEqual(porCodigo(1103305).nombre_visible, 'Jardín Nº 305');
  assert.strictEqual(porCodigo(90000006).nombre_visible, 'Liceo Nº 7 - Juan del Puerto');
  assert.strictEqual(porCodigo(90000028).nombre_visible, 'IFD Florida Maestra Elena Paz');
});

test('nombre normalizado: sale del nombre visible', () => {
  assert.strictEqual(porCodigo(1101035).nombre_normalizado, 'escuela 35 republica de islandia');
  assert.strictEqual(porCodigo(90000022).nombre_normalizado, 'escuela tecnica solymar');
});

test('conserva las dependencias que no son escuelas (inspecciones, privadas)', () => {
  assert.ok(porCodigo(90000004));
  assert.ok(porCodigo(90000002));
});

test('descarta rubros desconocidos y códigos inválidos', () => {
  const r = n.limpiarUniverso_([
    { 'Código Ceibal': 'abc', 'Nombre Dependencia': 'X', Rubro: 'DGES', Departamento: 'Salto' },
    { 'Código Ceibal': 5, 'Nombre Dependencia': 'X', Rubro: 'OTRO', Departamento: 'Salto' },
    { 'Código Ceibal': 6, 'Nombre Dependencia': '', Rubro: 'DGES', Departamento: 'Salto' },
    { 'Código Ceibal': 7, 'Nombre Dependencia': 'Liceo 1', Rubro: 'dges', Departamento: 'Salto', Localidad: null },
  ]);
  assert.deepStrictEqual(r.descartadas.map(d => d.motivo), ['código inválido', 'rubro desconocido', 'sin nombre']);
  assert.strictEqual(r.centros.length, 1);
  assert.strictEqual(r.centros[0].subsistema, 'DGES');
  assert.strictEqual(r.centros[0].localidad, '');
});

test('no modifica las filas de entrada ni falla con entrada vacía', () => {
  const copia = JSON.stringify(universo.filas);
  n.limpiarUniverso_(universo.filas);
  assert.strictEqual(JSON.stringify(universo.filas), copia);
  assert.deepStrictEqual(n.limpiarUniverso_(undefined), { centros: [], descartadas: [], duplicadas: 0 });
});

test('centroAFila_ sigue el orden de las columnas de la pestaña Centros', () => {
  const fila = n.centroAFila_(porCodigo(1101035));
  assert.strictEqual(fila.length, n.COLUMNAS_CENTROS_.length);
  assert.strictEqual(fila[0], 1101035);
  assert.strictEqual(fila[n.COLUMNAS_CENTROS_.indexOf('numero')], 35);
  assert.strictEqual(n.centroAFila_({ codigo: 1 })[1], '');
});
