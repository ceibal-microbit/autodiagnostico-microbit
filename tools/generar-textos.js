// Genera src/textos.js (la carga inicial de la pestaña Textos) a partir de docs/INSTRUMENTO.md.
// Uso: node tools/generar-textos.js
// docs/INSTRUMENTO.md es la fuente de verdad: si cambia un texto ahí, se vuelve a correr este script.
// test/textos.test.js verifica que src/textos.js esté al día.
const fs = require('fs');
const path = require('path');

const limpiarNegrita = texto => texto.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();

/** Lee el texto de docs/INSTRUMENTO.md y devuelve { clave: texto } con las claves de la pestaña Textos. */
function parsearInstrumento(md) {
  const lineas = md.split(/\r?\n/);
  const t = {};
  const citas = { intro: [], cierre: [] };
  let seccion = '';
  let dim = null;
  let nivel = null;

  for (const linea of lineas) {
    const titulo = /^## (.+)$/.exec(linea);
    if (titulo) {
      seccion = titulo[1].trim();
      dim = null;
      nivel = null;
      continue;
    }
    const subtitulo = /^### (d\d) — (.+)$/.exec(linea);
    if (subtitulo) {
      dim = subtitulo[1];
      nivel = null;
      if (seccion === 'Afirmaciones') t[`${dim}_nombre`] = subtitulo[2].trim();
      continue;
    }
    const cita = /^>\s?(.*)$/.exec(linea);
    const textoCita = cita ? cita[1].trim() : null;

    if (seccion.startsWith('Introducción') && textoCita) citas.intro.push(textoCita);
    else if (seccion.startsWith('Preguntas de contexto') && textoCita && !t.ctx_intro) t.ctx_intro = textoCita;
    else if (seccion === 'Afirmaciones') {
      if (textoCita && !t.afirmaciones_intro) t.afirmaciones_intro = textoCita;
      const observa = /^\*\*Qué observa:\*\* (.+)$/.exec(linea);
      if (observa && dim) t[`${dim}_observa`] = observa[1].trim();
    } else if (seccion.startsWith('Puntaje')) {
      const todas = /"(Todas tus dimensiones[^"]*)"/.exec(linea);
      if (todas) t.proximo_paso_todas_consolidadas = todas[1];
    } else if (seccion === 'Devoluciones') {
      const rotulos = /El rótulo de la recomendación es "([^"]+)" en los niveles `f` y `d`, y "([^"]+)" en `c`/.exec(linea);
      if (rotulos) {
        t.rec_rotulo_f = rotulos[1];
        t.rec_rotulo_d = rotulos[1];
        t.rec_rotulo_c = rotulos[2];
      }
      if (!dim) continue;
      const texto = /^- \*\*([fdc]):\*\* (.+)$/.exec(linea);
      if (texto) {
        nivel = texto[1];
        t[`${dim}_${nivel}_texto`] = texto[2].trim();
        continue;
      }
      const rec = /^\s+\*\*Recomendación:\*\* (.+)$/.exec(linea);
      if (rec && nivel) t[`${dim}_${nivel}_rec`] = rec[1].trim();
    } else if (seccion === 'Cierre' && textoCita) citas.cierre.push(textoCita);
  }

  citas.intro.forEach((p, i) => { t[`intro_${i + 1}`] = p; });
  citas.cierre.forEach((p, i) => { t[i === 0 ? 'cierre_titulo' : `cierre_${i}`] = i === 0 ? limpiarNegrita(p) : p; });
  return ordenar(t);
}

/** Mismo contenido, con las claves en un orden estable y legible para la pestaña Textos. */
function ordenar(t) {
  const orden = ['intro_1', 'intro_2', 'ctx_intro', 'afirmaciones_intro'];
  for (const d of ['d1', 'd2', 'd3', 'd4', 'd5']) {
    orden.push(`${d}_nombre`, `${d}_observa`);
    for (const n of ['f', 'd', 'c']) orden.push(`${d}_${n}_texto`, `${d}_${n}_rec`);
  }
  orden.push('rec_rotulo_f', 'rec_rotulo_d', 'rec_rotulo_c', 'proximo_paso_todas_consolidadas', 'cierre_titulo', 'cierre_1', 'cierre_2');
  const salida = {};
  for (const k of orden) if (k in t) salida[k] = t[k];
  for (const k of Object.keys(t)) if (!(k in salida)) salida[k] = t[k];
  return salida;
}

/** Contenido exacto de src/textos.js para un conjunto de textos. */
function armarArchivo(textos) {
  const lineas = Object.entries(textos).map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`);
  return [
    '/**',
    ' * textos.js — Carga inicial de la pestaña Textos de la Sheet.',
    ' *',
    ' * GENERADO desde docs/INSTRUMENTO.md con `node tools/generar-textos.js`. No editar a mano.',
    ' * La app lee los textos de la pestaña Textos de la Sheet, no de este archivo: esto solo se usa',
    ' * para llenar esa pestaña con "Autodiagnóstico → Preparar planilla" (no pisa lo que ya existe).',
    ' */',
    '',
    'const TEXTOS_INICIALES_ = {',
    ...lineas,
    '};',
    '',
    "if (typeof module !== 'undefined') {",
    '  module.exports = { TEXTOS_INICIALES_ };',
    '}',
    '',
  ].join('\n');
}

function principal() {
  const raiz = path.join(__dirname, '..');
  const md = fs.readFileSync(path.join(raiz, 'docs', 'INSTRUMENTO.md'), 'utf8');
  const textos = parsearInstrumento(md);
  fs.writeFileSync(path.join(raiz, 'src', 'textos.js'), armarArchivo(textos));
  console.log(`src/textos.js generado con ${Object.keys(textos).length} textos.`);
}

if (require.main === module) principal();

module.exports = { parsearInstrumento, armarArchivo };
