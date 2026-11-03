// src/textos.js (carga inicial de la pestaña Textos) tiene que decir lo mismo que docs/INSTRUMENTO.md.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { TEXTOS_INICIALES_ } = require('../src/textos.js');
const { parsearInstrumento, armarArchivo } = require('../tools/generar-textos.js');

const raiz = path.join(__dirname, '..');
const md = fs.readFileSync(path.join(raiz, 'docs', 'INSTRUMENTO.md'), 'utf8');
const esperados = parsearInstrumento(md);

test('src/textos.js está al día con docs/INSTRUMENTO.md (si falla: node tools/generar-textos.js)', () => {
  assert.deepStrictEqual(TEXTOS_INICIALES_, esperados);
  const archivo = fs.readFileSync(path.join(raiz, 'src', 'textos.js'), 'utf8').replace(/\r\n/g, '\n');
  assert.strictEqual(archivo, armarArchivo(esperados));
});

test('están todas las claves de docs/ARQUITECTURA.md y ninguna está vacía', () => {
  const claves = ['intro_1', 'intro_2', 'cierre_titulo', 'cierre_1', 'cierre_2', 'ctx_intro', 'afirmaciones_intro',
    'rec_rotulo_f', 'rec_rotulo_d', 'rec_rotulo_c', 'proximo_paso_todas_consolidadas'];
  for (const d of ['d1', 'd2', 'd3', 'd4', 'd5']) {
    claves.push(`${d}_nombre`, `${d}_observa`);
    for (const nivel of ['f', 'd', 'c']) claves.push(`${d}_${nivel}_texto`, `${d}_${nivel}_rec`);
  }
  assert.deepStrictEqual(Object.keys(TEXTOS_INICIALES_).sort(), claves.sort());
  for (const [clave, texto] of Object.entries(TEXTOS_INICIALES_)) {
    assert.ok(typeof texto === 'string' && texto.trim() !== '', `${clave} está vacío`);
  }
});

test('textos puntuales de INSTRUMENTO.md llegaron completos', () => {
  assert.strictEqual(TEXTOS_INICIALES_.d1_nombre, 'Autonomía técnica');
  assert.strictEqual(TEXTOS_INICIALES_.cierre_titulo, 'No existe un único camino para avanzar con micro:bit.');
  assert.match(TEXTOS_INICIALES_.intro_1, /^Este breve autodiagnóstico .* No hay respuestas correctas o incorrectas\.$/);
  assert.match(TEXTOS_INICIALES_.d3_f_texto, /^Es posible que todavía existan algunas barreras/);
  assert.match(TEXTOS_INICIALES_.d4_c_rec, /Ceibal\.$/);
  assert.match(TEXTOS_INICIALES_.proximo_paso_todas_consolidadas, /^Todas tus dimensiones aparecen consolidadas\./);
  assert.strictEqual(TEXTOS_INICIALES_.rec_rotulo_c, 'Tu próximo desafío puede ser:');
});

test('el generador entiende archivos con saltos de línea de Windows', () => {
  assert.deepStrictEqual(parsearInstrumento(md.replace(/\n/g, '\r\n')), esperados);
});

test('los textos no tienen textos de las afirmaciones ni de las preguntas (esos quedan en el código)', () => {
  assert.ok(!Object.values(TEXTOS_INICIALES_).some(t => /Puedo crear o modificar programas en MakeCode/.test(t)));
});
