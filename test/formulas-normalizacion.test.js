const test = require('node:test');
const assert = require('node:assert');
const n = require('../src/nucleo.js');

test('fórmulas: apóstrofo delante de =, +, - y @', () => {
  for (const v of ['=IMAGE("https://example.com/x.png")', '+54 9 11', '-1+1', '@SUM(A1)', '=1+1']) {
    assert.strictEqual(n.protegerFormula_(v), "'" + v);
  }
});

test('fórmulas: también con espacios, tabulación o salto de línea al comienzo', () => {
  for (const v of ['  =1+1', '\t=1+1', '\r=1+1', '\n@x', '\tHola']) assert.strictEqual(n.protegerFormula_(v), "'" + v);
});

test('fórmulas: los textos normales y los valores que no son texto no cambian', () => {
  for (const v of ['Ana Pérez', 'a=b', 'Escuela Nº 35', '', '12345672', 5, null, undefined, true]) assert.strictEqual(n.protegerFormula_(v), v);
});

test('normalizar: tildes, mayúsculas y espacios', () => {
  assert.strictEqual(n.normalizarTexto_('  ESCUELA   Nº  35  República  de Islandia '), 'escuela 35 republica de islandia');
  assert.strictEqual(n.normalizarTexto_('Atlántida'), 'atlantida');
  assert.strictEqual(n.normalizarTexto_('Peñarol'), 'penarol');
});

test('normalizar: Nº, nro, # y no se confunden con el nombre', () => {
  for (const t of ['Esc. Nº 79', 'esc #79', 'ESC nro 79', 'escuela n° 79', 'Escuela N.º 79', 'escuela no. 79', 'Escuela Nº79']) {
    assert.strictEqual(n.normalizarTexto_(t), 'escuela 79', t);
  }
});

test('normalizar: abreviaturas esc, lic, JN y UTU', () => {
  assert.strictEqual(n.normalizarTexto_('Lic. 7'), 'liceo 7');
  assert.strictEqual(n.normalizarTexto_('JN 91'), 'jardin 91');
  assert.strictEqual(n.normalizarTexto_('UTU Solymar'), 'escuela tecnica solymar');
  assert.strictEqual(n.normalizarTexto_('Esc técnica Solymar'), 'escuela tecnica solymar');
});

test('normalizar: valores raros', () => {
  assert.strictEqual(n.normalizarTexto_(null), '');
  assert.strictEqual(n.normalizarTexto_(undefined), '');
  assert.strictEqual(n.normalizarTexto_(''), '');
  assert.strictEqual(n.normalizarTexto_(35), '35');
  assert.strictEqual(n.normalizarTexto_('...'), '');
});

test('normalizar es idempotente', () => {
  for (const t of ['Esc. Nº 79', 'UTU Solymar', 'Liceo Nº 7 - Juan del Puerto']) {
    assert.strictEqual(n.normalizarTexto_(n.normalizarTexto_(t)), n.normalizarTexto_(t));
  }
});
