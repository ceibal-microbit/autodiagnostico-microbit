const test = require('node:test');
const assert = require('node:assert');
const n = require('../src/nucleo.js');

const todas = valor => Array(15).fill(valor);
// Respuestas con una suma pedida por dimensión (cada suma entre 3 y 15).
function conSumas(sumas) {
  const r = [];
  for (const s of sumas) {
    const base = Math.floor(s / 3);
    const resto = s - base * 3;
    r.push(base + (resto > 0 ? 1 : 0), base + (resto > 1 ? 1 : 0), base);
  }
  return r;
}

test('niveles por suma: cortes en 7/8 y 11/12', () => {
  const esperado = { 3: 'f', 7: 'f', 8: 'd', 11: 'd', 12: 'c', 15: 'c' };
  for (const [suma, nivel] of Object.entries(esperado)) assert.strictEqual(n.nivelPorSuma_(Number(suma)), nivel, `suma ${suma}`);
});

test('los cortes enteros equivalen a los rangos de promedio del instrumento (2,4 / 2,5 / 3,7 / 3,8)', () => {
  for (let suma = 3; suma <= 15; suma++) {
    const promedio = suma / 3;
    const segunPromedio = promedio < 2.45 ? 'f' : promedio < 3.75 ? 'd' : 'c';
    assert.strictEqual(n.nivelPorSuma_(suma), segunPromedio, `suma ${suma}`);
  }
});

test('calcularPerfil_ suma de a tres respuestas y arma las 5 dimensiones en orden', () => {
  const r = [1, 2, 3, 4, 4, 4, 5, 5, 5, 3, 3, 2, 1, 1, 1];
  const perfil = n.calcularPerfil_(r);
  assert.deepStrictEqual(perfil.dimensiones.map(d => d.id), ['d1', 'd2', 'd3', 'd4', 'd5']);
  assert.deepStrictEqual(perfil.dimensiones.map(d => d.suma), [6, 12, 15, 8, 3]);
  assert.deepStrictEqual(perfil.dimensiones.map(d => d.nivel), ['f', 'c', 'c', 'd', 'f']);
  assert.strictEqual(perfil.dimensiones[0].promedio, 2);
  assert.strictEqual(perfil.dimensiones[3].promedio, 2.67);
});

test('el ejemplo de docs/ARQUITECTURA.md: suma 11 → promedio 3.67, nivel d', () => {
  const d = n.calcularPerfil_(conSumas([11, 9, 9, 9, 9])).dimensiones[0];
  assert.deepStrictEqual(d, { id: 'd1', suma: 11, promedio: 3.67, nivel: 'd' });
});

test('próximo paso: la dimensión con menor suma', () => {
  assert.deepStrictEqual(n.calcularPerfil_(conSumas([9, 5, 9, 9, 9])).proximoPaso, ['d2']);
});

test('próximo paso: si empatan dos, se nombran las dos', () => {
  assert.deepStrictEqual(n.calcularPerfil_(conSumas([9, 5, 9, 5, 9])).proximoPaso, ['d2', 'd4']);
});

test('próximo paso: si empatan más de dos, la primera en orden', () => {
  assert.deepStrictEqual(n.calcularPerfil_(conSumas([9, 5, 5, 5, 9])).proximoPaso, ['d2']);
  assert.deepStrictEqual(n.calcularPerfil_(todas(3)).proximoPaso, ['d1']);
});

test('próximo paso: todas consolidadas → vacío', () => {
  const perfil = n.calcularPerfil_(todas(5));
  assert.ok(perfil.dimensiones.every(d => d.nivel === 'c'));
  assert.deepStrictEqual(perfil.proximoPaso, []);
  assert.deepStrictEqual(n.calcularPerfil_(todas(4)).proximoPaso, []);
});

test('próximo paso: una sola dimensión no consolidada', () => {
  assert.deepStrictEqual(n.calcularPerfil_(conSumas([15, 15, 11, 15, 15])).proximoPaso, ['d3']);
});

test('calcularPerfil_ rechaza respuestas inválidas', () => {
  const malas = [
    null, 'x', [], todas(3).slice(0, 14), todas(3).concat([3]),
    todas(0), todas(6), todas(-1), todas(2.5), todas('3'), todas(NaN), todas(null),
  ];
  for (const m of malas) assert.throws(() => n.calcularPerfil_(m), `debía rechazar ${JSON.stringify(m)}`);
});

test('formatearPromedio_: un decimal con coma', () => {
  const esperado = { 3: '1,0', 4: '1,3', 5: '1,7', 7: '2,3', 8: '2,7', 9: '3,0', 11: '3,7', 12: '4,0', 14: '4,7', 15: '5,0' };
  for (const [suma, texto] of Object.entries(esperado)) assert.strictEqual(n.formatearPromedio_(Number(suma)), texto, `suma ${suma}`);
});
