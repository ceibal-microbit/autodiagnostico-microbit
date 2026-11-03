const test = require('node:test');
const assert = require('node:assert');
const n = require('../src/nucleo.js');
const universo = require('./fixtures/universo-sintetico.json');
const { casos } = require('./fixtures/casos-macheo.json');

const { centros } = n.limpiarUniverso_(universo.filas);

for (const caso of casos) {
  test(`macheo: "${caso.texto}" (${caso.subsistema}, ${caso.departamento}${caso.localidad ? ', ' + caso.localidad : ''}) — ${caso.nota}`, () => {
    const r = n.machearCentro_(caso.texto, caso.subsistema, caso.departamento, caso.localidad, centros);
    assert.strictEqual(r.codigo, caso.esperado, r.motivo);
    assert.strictEqual(r.estado, caso.estado);
    assert.strictEqual(r.confianza === 'baja', caso.estado === 'revisar');
  });
}

test('macheo: un acierto automático informa su confianza y no tiene motivo de duda', () => {
  const r = n.machearCentro_('Liceo 7 Juan del Puerto', 'DGES', 'Montevideo', '', centros);
  assert.deepStrictEqual(r, { codigo: 90000006, estado: 'automatico', confianza: 'alta', motivo: '' });
  assert.strictEqual(n.machearCentro_('Lic 7', 'DGES', 'Montevideo', '', centros).confianza, 'media');
});

test('macheo: tolera un error de tipeo en el nombre', () => {
  assert.strictEqual(n.machearCentro_('Norurga', 'DGEIP', 'Montevideo', '', centros).codigo, 1101003); // un error
  assert.strictEqual(n.machearCentro_('Nurugua', 'DGEIP', 'Montevideo', '', centros).codigo, null); // dos errores: revisar
  assert.strictEqual(n.machearCentro_('Islandya', 'DGEIP', 'Montevideo', '', centros).codigo, 1101035);
});

test('macheo: entradas raras van a revisión sin fallar', () => {
  for (const texto of ['', '   ', '...', null, undefined, 42, {}, 'x'.repeat(5000)]) {
    const r = n.machearCentro_(texto, 'DGEIP', 'Montevideo', '', centros);
    assert.strictEqual(r.estado, 'revisar', String(texto).slice(0, 20));
  }
  assert.strictEqual(n.machearCentro_('79', 'DGEIP', 'Florida', '', null).estado, 'revisar');
  assert.strictEqual(n.machearCentro_('79', 'XX', 'Florida', '', centros).estado, 'revisar');
});

test('macheo: no elige un centro de otro departamento ni de otro subsistema', () => {
  assert.strictEqual(n.machearCentro_('Noruega', 'DGEIP', 'Florida', '', centros).estado, 'revisar');
  assert.strictEqual(n.machearCentro_('Noruega', 'DGES', 'Montevideo', '', centros).estado, 'revisar');
});
