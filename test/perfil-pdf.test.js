// Prueba el perfil en HTML/PDF (nucleo.js) y descargarPerfil (Correo.js) con una planilla simulada.
// El simulador no convierte nada a PDF de verdad: que el conversor de Google dibuje bien el radar y los colores
// se prueba a mano en la Sheet de prueba (docs/SEGURIDAD.md, sección 9). Nada de esto manda mails.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const universo = require('./fixtures/universo-sintetico.json');
const n = require('../src/nucleo.js');
const { TEXTOS_INICIALES_ } = require('../src/textos.js');

const SRC = path.join(__dirname, '..', 'src');
const leer = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const scriptDe = html => /<script>([\s\S]*)<\/script>/.exec(html)[1];

const LIMPIOS = n.limpiarUniverso_(universo.filas).centros;
const VALIDOS = n.centrosDeFilas_([n.COLUMNAS_CENTROS_].concat(LIMPIOS.map(n.centroAFila_)));
const EN_MONTEVIDEO = VALIDOS.find(c => c.departamento === 'Montevideo');
const ATAQUE = '<img src=x onerror=alert(1)>';

function datosDe(cambios = {}) {
  const r = [4, 4, 3, 2, 2, 1, 3, 3, 2, 5, 4, 4, 2, 3, 3];
  return Object.assign({
    nombre: 'Ana Pérez', cedula: '12345672', email: 'ana@ejemplo.com', subsistema: 'DGEIP', departamento: 'Montevideo', localidad: '',
    centroCodigo: EN_MONTEVIDEO.codigo, centroTexto: 'lo que escribió', origenMacheo: 'elegido por docente', ctx: [1, 2, 3], r, perfil: n.calcularPerfil_(r),
  }, cambios);
}
const OPCIONES = { fecha: '05/11/2026', version: n.VERSION };

// --- Escapado ---

test('escaparHtml_ escapa los cinco caracteres y tolera valores raros', () => {
  assert.strictEqual(n.escaparHtml_(`<a href="x" onclick='y'>&</a>`), '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  assert.strictEqual(n.escaparHtml_(null), '');
  assert.strictEqual(n.escaparHtml_(undefined), '');
  assert.strictEqual(n.escaparHtml_(42), '42');
});

test('el HTML del perfil escapa el nombre, el centro y los textos de la Sheet', () => {
  const textos = Object.assign({}, TEXTOS_INICIALES_, { d1_nombre: ATAQUE, d2_d_texto: ATAQUE, cierre_titulo: ATAQUE, rec_rotulo_d: ATAQUE });
  const html = n.armarHtmlPerfil_(datosDe({ nombre: ATAQUE + ' Pérez' }), ATAQUE, textos, { fecha: ATAQUE, version: ATAQUE });
  assert.ok(!html.includes('<img'), 'quedó una etiqueta sin escapar');
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('con el texto de ataque en TODAS las claves de Textos, el HTML no deja ninguna etiqueta sin escapar', () => {
  const textos = Object.fromEntries(Object.keys(TEXTOS_INICIALES_).map(k => [k, ATAQUE]));
  const html = n.armarHtmlPerfil_(datosDe(), 'Escuela', textos, OPCIONES);
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('el HTML del perfil no lleva la cédula ni el correo', () => {
  const html = n.armarHtmlPerfil_(datosDe(), 'Escuela de prueba', TEXTOS_INICIALES_, OPCIONES);
  assert.ok(!html.includes('12345672') && !html.includes('1.234.567'));
  assert.ok(!html.includes('ana@ejemplo.com'));
});

test('el HTML del perfil trae el radar, las cinco dimensiones con nivel y promedio, y el cierre', () => {
  const datos = datosDe();
  const html = n.armarHtmlPerfil_(datos, 'Escuela de prueba', TEXTOS_INICIALES_, OPCIONES);
  assert.ok(html.includes('<svg'));
  assert.ok(html.includes('Ana, este es el resultado'));
  assert.ok(html.includes('Ana Pérez · Escuela de prueba · 05/11/2026'));
  datos.perfil.dimensiones.forEach((d, i) => {
    assert.ok(html.includes(`${i + 1}. ${TEXTOS_INICIALES_[d.id + '_nombre']}`), d.id);
    assert.ok(html.includes(n.escaparHtml_(TEXTOS_INICIALES_[`${d.id}_${d.nivel}_texto`])), d.id + ' texto');
    assert.ok(html.includes(n.formatearPromedio_(d.suma)), d.id + ' promedio');
  });
  assert.ok(html.includes(n.escaparHtml_(TEXTOS_INICIALES_.cierre_titulo)));
  assert.ok(html.includes('versión ' + n.VERSION));
  assert.ok(!html.includes('próximo paso'), 'el perfil no muestra "Tu próximo paso"');
});

test('ningún color de fondo depende de CSS ni de bgcolor: el conversor a PDF de Google los ignora (probado a mano el 05/11/2026)', () => {
  const html = n.armarHtmlPerfil_(datosDe(), 'Escuela', TEXTOS_INICIALES_, OPCIONES);
  assert.ok(!/background/i.test(html), 'quedó un fondo de CSS');
  assert.ok(!/bgcolor/i.test(html), 'quedó un bgcolor');
});

test('las franjas de color son SVG: la de arriba, una por dimensión con su color, y los cuadritos de las leyendas', () => {
  const html = n.armarHtmlPerfil_(datosDe(), 'Escuela', TEXTOS_INICIALES_, OPCIONES);
  assert.ok(html.includes('fill="#00635D"'), 'franja de arriba');
  for (const color of ['#7BCDC1', '#D17EB2', '#F2E616', '#27B2D9', '#E6665D']) assert.ok(html.includes('<rect x="0" y="0" width="658" height="58" fill="' + color + '"/>'), color);
  assert.strictEqual((html.match(/width="14" height="14"/g) || []).length, 3 + 5);
  // El texto de las franjas se escapa como todo lo demás.
  const textos = Object.assign({}, TEXTOS_INICIALES_, { d3_nombre: ATAQUE });
  assert.ok(!n.armarHtmlPerfil_(datosDe(), 'Escuela', textos, OPCIONES).includes('<img'));
});

test('el cierre y la recomendación se marcan con una barra de color a la izquierda, que el conversor sí dibuja', () => {
  const html = n.armarHtmlPerfil_(datosDe(), 'Escuela', TEXTOS_INICIALES_, OPCIONES);
  assert.ok(html.includes('border-left:6px solid #5A2382'));
  assert.strictEqual((html.match(/border-left:4px solid/g) || []).length, 5);
});

test('una clave que falta en Textos no rompe el perfil ni escribe "undefined"', () => {
  const html = n.armarHtmlPerfil_(datosDe(), 'Escuela', {}, OPCIONES);
  assert.ok(!html.includes('undefined'));
  assert.ok(!html.includes('null'));
});

// --- Radar ---

const NOMBRES = ['puntoDelRadar', 'distanciaDePromedio', 'puntosDelRadar', 'RADAR', 'ZONAS_RADAR'];
const b = vm.runInContext(`${scriptDe(leer('buscador.html'))}\n;({ ${NOMBRES.join(', ')} })`, vm.createContext({}));

test('el radar del PDF y el de la página dibujan los mismos puntos', () => {
  assert.deepStrictEqual(JSON.parse(JSON.stringify(b.RADAR)), n.RADAR_);
  assert.deepStrictEqual(Array.from(b.ZONAS_RADAR, z => z[0]), n.ZONAS_RADAR_.map(z => z[0]));
  for (const promedios of [[1, 1, 1, 1, 1], [5, 5, 5, 5, 5], [3.67, 2.33, 1.67, 4.33, 5], [1, 2.5, 3.8, 5, 1.33]]) {
    assert.strictEqual(n.puntosDelRadar_(promedios), b.puntosDelRadar(promedios));
  }
  for (let i = 0; i < 5; i++) for (const d of [0, 50, 112, 129]) assert.deepStrictEqual(n.puntoDelRadar_(i, d), Array.from(b.puntoDelRadar(i, d)));
  for (const p of [1, 2.5, 3.8, 5]) assert.strictEqual(n.distanciaDePromedio_(p), b.distanciaDePromedio(p));
});

test('el SVG del radar tiene tamaño fijo y sus colores en cada elemento, sin clases de CSS', () => {
  const svg = n.armarRadarSvg_(datosDe().perfil.dimensiones);
  assert.match(svg, /^<svg [^>]*width="320" height="300"/);
  assert.ok(!svg.includes('class='));
  assert.strictEqual((svg.match(/<circle/g) || []).length, 5);
  assert.strictEqual((svg.match(/<text/g) || []).length, 5);
});

// --- nombreDeCentroParaPerfil_ ---

test('el centro elegido se muestra con el nombre del catálogo y el no encontrado con lo que escribió el docente', () => {
  assert.strictEqual(n.nombreDeCentroParaPerfil_(datosDe(), VALIDOS), String(EN_MONTEVIDEO.nombre_visible));
  assert.strictEqual(n.nombreDeCentroParaPerfil_(datosDe({ centroCodigo: null, centroTexto: 'Mi escuelita' }), VALIDOS), 'Mi escuelita');
  assert.strictEqual(n.nombreDeCentroParaPerfil_(datosDe({ centroCodigo: 99999999 }), VALIDOS), 'lo que escribió');
});

// --- descargarPerfil (Correo.js) con la planilla simulada ---

function hoja(filas) {
  return { getDataRange() { return { getValues: () => filas.map(f => f.slice()) }; } };
}

function entorno({ sinTextos = false, falloElPdf = false } = {}) {
  const hojas = {
    Centros: hoja([n.COLUMNAS_CENTROS_].concat(LIMPIOS.map(n.centroAFila_))),
    Config: hoja([['clave', 'valor', 'descripcion']]),
    Respuestas: { getDataRange() { throw new Error('descargarPerfil no debe leer Respuestas'); }, getLastRow() { throw new Error('no debe leer Respuestas'); }, appendRow() { throw new Error('no debe escribir'); } },
  };
  if (!sinTextos) hojas.Textos = hoja([['clave', 'texto']].concat(Object.entries(TEXTOS_INICIALES_)));
  const registro = [];
  const convertidos = [];
  const anotar = (...a) => registro.push(a.join(' '));
  const contexto = vm.createContext({
    console: { error: anotar, warn: anotar, log: anotar },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: nombre => hojas[nombre] || null }) },
    Utilities: {
      formatDate: (fecha, zona, formato) => { convertidos.push([zona, formato]); return '05/11/2026'; },
      newBlob: (html, tipo, nombre) => ({
        getAs(destino) {
          if (falloElPdf) throw new Error('Se agotó la cuota con datos privados');
          convertidos.push([tipo, destino, nombre, html]);
          return { getBytes: () => Buffer.from('%PDF-simulado') };
        },
      }),
      base64Encode: bytes => Buffer.from(bytes).toString('base64'),
    },
  });
  const f = vm.runInContext(['nucleo.js', 'Codigo.js', 'Correo.js'].map(leer).join('\n') + '\n;({ descargarPerfil })', contexto);
  return { registro, convertidos, ...f };
}

function envioValido(cambios = {}) {
  return Object.assign({
    nombre: 'Docente de Prueba', cedula: '1.234.567-2', email: 'Docente@Ejemplo.com',
    subsistema: EN_MONTEVIDEO.subsistema, departamento: 'Montevideo', localidad: '',
    centroCodigo: EN_MONTEVIDEO.codigo, centroTexto: 'escuela', ctx: [1, 2, 3],
    r: [4, 4, 3, 2, 2, 1, 3, 3, 2, 5, 4, 4, 2, 3, 3], abiertoEn: Date.now() - 120000, trampa: '',
  }, cambios);
}

test('descargarPerfil devuelve el PDF en base64 con un nombre de archivo fijo', () => {
  const e = entorno();
  const r = e.descargarPerfil(envioValido());
  assert.deepStrictEqual(Object.keys(r).sort(), ['nombreArchivo', 'ok', 'pdf']);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.nombreArchivo, 'autodiagnostico-microbit.pdf');
  assert.strictEqual(Buffer.from(r.pdf, 'base64').toString(), '%PDF-simulado');
  const [, destino, , html] = e.convertidos.find(c => c.length === 4);
  assert.strictEqual(destino, 'application/pdf');
  assert.ok(html.includes('Docente, este es el resultado'));
  assert.ok(e.convertidos.some(c => c[0] === 'America/Montevideo'), 'la fecha se arma en la zona de Montevideo');
});

test('descargarPerfil recalcula el perfil y no confía en lo que mande el navegador', () => {
  const e = entorno();
  e.descargarPerfil(envioValido({ perfil: { dimensiones: [] }, mailEnviado: true, nombreArchivo: '../x.pdf' }));
  const html = e.convertidos.find(c => c.length === 4)[3];
  assert.ok(html.includes('Autonomía técnica'));
});

test('descargarPerfil rechaza un envío inválido con un mensaje genérico y sin generar nada', () => {
  const e = entorno();
  const mensaje = { ok: false, mensaje: 'No pudimos preparar el PDF. Intentá más tarde.' };
  for (const malo of [null, {}, envioValido({ cedula: '1234567' }), envioValido({ r: [1, 2] }), envioValido({ email: 'no es un correo' }), envioValido({ nombre: ATAQUE.repeat(10) }), 'texto']) {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(e.descargarPerfil(malo))), mensaje);
  }
  assert.strictEqual(e.convertidos.length, 0);
});

test('descargarPerfil escapa lo que escribió el docente al armar el PDF', () => {
  const e = entorno();
  const r = e.descargarPerfil(envioValido({ nombre: 'Ana <b>Pérez</b>', centroCodigo: null, centroTexto: ATAQUE + ' Escuela' }));
  assert.strictEqual(r.ok, true);
  const html = e.convertidos.find(c => c.length === 4)[3];
  assert.ok(!html.includes('<img') && !html.includes('<b>Pérez'));
});

test('si falla la conversión (por ejemplo, cuota agotada) devuelve un mensaje genérico y no filtra el error', () => {
  const e = entorno({ falloElPdf: true });
  const r = JSON.parse(JSON.stringify(e.descargarPerfil(envioValido())));
  assert.deepStrictEqual(r, { ok: false, mensaje: 'No pudimos preparar el PDF. Intentá más tarde.' });
  assert.ok(e.registro.every(l => !l.includes('datos privados')), 'el mensaje del error de Google no debe quedar en el registro');
});

test('si falta la pestaña Textos devuelve el mismo mensaje genérico', () => {
  const r = JSON.parse(JSON.stringify(entorno({ sinTextos: true }).descargarPerfil(envioValido())));
  assert.deepStrictEqual(r, { ok: false, mensaje: 'No pudimos preparar el PDF. Intentá más tarde.' });
});

test('descargarPerfil no lee ni escribe Respuestas', () => {
  // La hoja simulada de Respuestas lanza un error si alguien la toca: el PDF sale igual.
  assert.strictEqual(entorno().descargarPerfil(envioValido()).ok, true);
});

// --- La página ---

test('la página pide el PDF con las mismas respuestas y no manda nombre ni datos en el archivo', () => {
  const app = leer('app.html');
  assert.ok(app.includes('.descargarPerfil(armarEnvio(S, valorTrampa))'));
  assert.ok(app.includes('Descargar en PDF'));
  assert.ok(app.includes("bajarPdf(r.pdf, 'autodiagnostico-microbit.pdf')"), 'el nombre del archivo lo fija la página, no el servidor');
});
