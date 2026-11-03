// Piezas puras de la fase 3: encabezados de pestañas, lectura del Universo y resumen de la limpieza.
const test = require('node:test');
const assert = require('node:assert');
const n = require('../src/nucleo.js');
const universo = require('./fixtures/universo-sintetico.json');

test('Respuestas: encabezados según docs/ARQUITECTURA.md', () => {
  const e = n.ENCABEZADOS_RESPUESTAS_;
  assert.deepStrictEqual(e.slice(0, 15), [
    'fecha_hora', 'version_app', 'version_instrumento', 'nombre', 'cedula', 'email', 'subsistema', 'departamento',
    'localidad', 'centro_texto', 'centro_codigo', 'origen_macheo', 'ctx_1', 'ctx_2', 'ctx_3',
  ]);
  assert.deepStrictEqual(e.slice(15, 30).filter((c, i) => i < 3), ['d1_i1', 'd1_i2', 'd1_i3']);
  assert.strictEqual(e[29], 'd5_i3');
  assert.deepStrictEqual(e.slice(30, 35), ['d1_suma', 'd2_suma', 'd3_suma', 'd4_suma', 'd5_suma']);
  assert.deepStrictEqual(e.slice(35, 40), ['d1_nivel', 'd2_nivel', 'd3_nivel', 'd4_nivel', 'd5_nivel']);
  assert.strictEqual(e[40], 'mail_enviado');
  assert.strictEqual(e.length, 41);
  assert.strictEqual(new Set(e).size, e.length);
});

test('Respuestas: las columnas de texto libre existen, incluida la cédula (para no perder el cero inicial)', () => {
  for (const c of ['nombre', 'cedula', 'email', 'centro_texto']) assert.ok(n.COLUMNAS_TEXTO_RESPUESTAS_.includes(c), c);
  for (const c of n.COLUMNAS_TEXTO_RESPUESTAS_) assert.ok(n.ENCABEZADOS_RESPUESTAS_.includes(c), c);
});

test('Config inicial: los parámetros de docs/ARQUITECTURA.md', () => {
  const porClave = Object.fromEntries(n.CONFIG_INICIAL_.map(f => [f[0], f[1]]));
  assert.deepStrictEqual(porClave, {
    max_envios_cedula_dia: 3, max_mails_destino_dia: 1, max_envios_hora: '', segundos_minimos: 60, correo_equipo_alertas: '',
  });
  for (const fila of n.CONFIG_INICIAL_) assert.strictEqual(fila.length, n.ENCABEZADOS_CONFIG_.length);
});

test('filasQueFaltan_: solo las claves que todavía no están', () => {
  const iniciales = [['a', '1'], ['b', '2'], ['c', '3']];
  assert.deepStrictEqual(n.filasQueFaltan_(['b'], iniciales), [['a', '1'], ['c', '3']]);
  assert.deepStrictEqual(n.filasQueFaltan_([' a ', 'b', 'c'], iniciales), []);
  assert.deepStrictEqual(n.filasQueFaltan_([], iniciales), iniciales);
});

test('mismosEncabezados_: ignora mayúsculas y espacios, acepta columnas de más', () => {
  assert.ok(n.mismosEncabezados_(['Clave ', 'TEXTO', 'extra'], ['clave', 'texto']));
  assert.ok(!n.mismosEncabezados_(['clave'], ['clave', 'texto']));
  assert.ok(!n.mismosEncabezados_(['texto', 'clave'], ['clave', 'texto']));
});

function valoresDeUniverso(extra) {
  const columnas = universo.columnas.concat(extra ? ['Teléfono'] : []);
  const filas = universo.filas.map(f => universo.columnas.map(c => (f[c] === undefined ? null : f[c])).concat(extra ? ['099 123 456'] : []));
  return [columnas].concat(filas.map(f => f.map(v => (v === null ? '' : v))));
}

test('filasDeUniverso_: lee los encabezados por nombre e ignora las columnas de más', () => {
  const r = n.filasDeUniverso_(valoresDeUniverso(true));
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.filas.length, universo.filas.length);
  assert.deepStrictEqual(Object.keys(r.filas[0]), n.COLUMNAS_UNIVERSO_);
  assert.ok(!r.filas.some(f => 'Teléfono' in f));
});

test('filasDeUniverso_: las columnas pueden venir en otro orden y sin tildes', () => {
  const valores = [['localidad', 'Departamento', 'Rubro', 'Codigo Ceibal', 'Nombre dependencia', 'tipo dependencia'], ['Pando', 'CANELONES', 'DGES', 5, 'LICEO Nº 1', 'Liceo Público']];
  const r = n.filasDeUniverso_(valores);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.filas[0]['Código Ceibal'], 5);
  assert.strictEqual(r.filas[0].Localidad, 'Pando');
});

test('filasDeUniverso_: avisa qué columnas faltan', () => {
  const r = n.filasDeUniverso_([['Código Ceibal', 'Rubro'], [1, 'DGES']]);
  assert.strictEqual(r.ok, false);
  assert.deepStrictEqual(r.faltan, ['Nombre Dependencia', 'Tipo dependencia', 'Departamento', 'Localidad']);
  assert.strictEqual(n.filasDeUniverso_([]).ok, false);
  assert.strictEqual(n.filasDeUniverso_(null).ok, false);
});

test('filasDeUniverso_: saltea las filas completamente vacías', () => {
  const valores = valoresDeUniverso(false);
  valores.splice(3, 0, ['', '', '', '', '', ''], [null, null, null, null, null, null]);
  assert.strictEqual(n.filasDeUniverso_(valores).filas.length, universo.filas.length);
});

test('la limpieza del Universo leído de la hoja da lo mismo que con las filas del fixture', () => {
  const desdeHoja = n.limpiarUniverso_(n.filasDeUniverso_(valoresDeUniverso(true)).filas);
  assert.deepStrictEqual(desdeHoja, n.limpiarUniverso_(universo.filas));
});

test('resumenLimpieza_ cuenta centros, repetidos, descartados y observaciones', () => {
  const texto = n.resumenLimpieza_(n.limpiarUniverso_(universo.filas));
  assert.match(texto, /Centros en el catálogo: 63(?!\d)/);
  assert.match(texto, /Filas repetidas que se sacaron: 2/);
  assert.match(texto, /Filas descartadas: 1 \(sin departamento: 1\)/);
  assert.match(texto, /con observaciones para revisar \(columna "observacion"\): 7/);
  assert.strictEqual(n.resumenLimpieza_({ centros: [], descartadas: [], duplicadas: 0 }), 'Centros en el catálogo: 0');
});
