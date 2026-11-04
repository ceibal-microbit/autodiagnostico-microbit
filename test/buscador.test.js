// Prueba src/buscador.html y las reglas de la página. Ejecuta el <script> del HTML con vm, tal como corre en el navegador.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const universo = require('./fixtures/universo-sintetico.json');
const n = require('../src/nucleo.js');

const SRC = path.join(__dirname, '..', 'src');
const leer = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const scriptDe = html => /<script>([\s\S]*)<\/script>/.exec(html)[1];

const NOMBRES = ['claveSimple', 'normalizarTexto', 'limpiarCedula', 'cedulaValida', 'correoValido', 'sugerirCorreo', 'distanciaEdicion', 'formatearPromedio',
  'textoProlijo', 'nombreValido', 'soloDigitos', 'formatearCedula', 'centrosDesdeServidor', 'departamentosDe', 'localidadesDe', 'candidatosDe', 'buscarCentros',
  'estadoVacio', 'armarEnvio', 'restaurarAvance'];
const b = vm.runInContext(`${scriptDe(leer('buscador.html'))}\n;({ ${NOMBRES.join(', ')} })`, vm.createContext({}));

const LIMPIOS = n.limpiarUniverso_(universo.filas).centros;
const VALIDOS = n.centrosDeFilas_([n.COLUMNAS_CENTROS_].concat(LIMPIOS.map(n.centroAFila_)));
const CATALOGO = b.centrosDesdeServidor(n.centrosParaNavegador_(VALIDOS));
const aPlano = v => JSON.parse(JSON.stringify(v));

// --- Mismas respuestas que nucleo.js ---

test('normalizar da lo mismo en la página y en el servidor', () => {
  const casos = ['ESCUELA Nº 35', 'esc. 35', 'Esc 35', 'Jardín N° 12', 'JN 12', 'UTU de Pando', 'lic 7', 'Liceo nro. 7', 'Escuela #4', '', null, undefined, 42,
    'República de Islandia', '  muchos   espacios  ', 'Ñandú', 'número 5', 'no', 'CERP del Este', 'IFD ñ'];
  for (const c of casos) {
    assert.strictEqual(b.normalizarTexto(c), n.normalizarTexto_(c), `normalizarTexto: ${c}`);
    assert.strictEqual(b.claveSimple(c), n.claveSimple_(c), `claveSimple: ${c}`);
  }
  for (const c of LIMPIOS) assert.strictEqual(b.normalizarTexto(c.nombre_visible), c.nombre_normalizado);
});

test('la cédula se valida igual en la página y en el servidor', () => {
  const casos = ['1.234.567-2', '12345672', '1234567', '1.234.567-3', '123456', '123456789', '', 'abc', '1 234 567 2', '0.123.456-7', '6123458', null, undefined, 12345672, 'x'.repeat(30)];
  for (let i = 0; i < 400; i++) casos.push(String(1000000 + i * 12347));
  for (const c of casos) {
    assert.strictEqual(b.cedulaValida(c), n.cedulaValida_(c), `cedula: ${c}`);
    assert.strictEqual(b.limpiarCedula(c), n.limpiarCedula_(c), `limpiar: ${c}`);
  }
});

test('el correo se valida y se sugiere igual en la página y en el servidor', () => {
  const casos = ['a@b.co', 'docente@gmial.com', 'docente@gmail.com', 'docente@hotmial.com', 'x@ceibal.edu.uy', 'x@ceibal.edu.ur', 'sin-arroba', '@b.com', 'a@b', 'a b@c.com', '',
    null, undefined, 'a'.repeat(65) + '@b.com', 'a@' + 'b'.repeat(260) + '.com', "o'neil@yahoo.com", 'nombre+alias@outlook.com', 'x@outlok.com', 'x@yaho.com.ar', 'X@GMIAL.COM', 'x@vera.com.uy'];
  for (const c of casos) {
    assert.strictEqual(b.correoValido(c), n.correoValido_(c), `correoValido: ${c}`);
    assert.strictEqual(b.sugerirCorreo(c), n.sugerirCorreo_(c), `sugerir: ${c}`);
  }
});

test('el promedio se muestra igual en la página y en el servidor', () => {
  for (let suma = 3; suma <= 15; suma++) assert.strictEqual(b.formatearPromedio(suma), n.formatearPromedio_(suma));
});

test('la lista de caracteres invisibles coincide con la que rechaza el servidor', () => {
  const invisibles = ['\u0000', '\u001f', '\u007f', '\u0085', '​', '‏', '‪', '‮', '⁠', '⁯', '﻿'];
  for (const c of invisibles) {
    const limpio = b.textoProlijo(`Ana${c} Pérez`);
    assert.strictEqual(limpio, 'Ana Pérez', JSON.stringify(c));
    assert.ok(n.validarEnvio_({ nombre: `Ana${c} Pérez` }, []).campo === 'nombre', JSON.stringify(c));
  }
});

// --- Catálogo y buscador ---

test('el catálogo llega con las columnas que usa el buscador', () => {
  const c = CATALOGO[0];
  assert.deepStrictEqual(Object.keys(c).sort(), ['codigo', 'departamento', 'localidad', 'localidadClave', 'normalizado', 'numero', 'subsistema', 'tipo', 'visible']);
});

test('los departamentos son solo los del subsistema elegido', () => {
  for (const sub of ['DGEIP', 'DGES', 'DGETP', 'CFE']) {
    const lista = b.departamentosDe(CATALOGO, sub);
    assert.ok(lista.every(d => CATALOGO.some(c => c.subsistema === sub && c.departamento === d)), sub);
    assert.deepStrictEqual(aPlano(lista), aPlano(lista).slice().sort((x, y) => x.localeCompare(y, 'es')));
  }
  assert.deepStrictEqual(aPlano(b.departamentosDe(CATALOGO, 'INVENTADO')), []);
  const conCfe = [{ subsistema: 'CFE', departamento: 'Rocha', localidad: 'Chuy' }, { subsistema: 'DGES', departamento: 'Salto', localidad: 'Salto' }];
  assert.deepStrictEqual(aPlano(b.departamentosDe(conCfe, 'CFE')), ['Rocha']);
});

test('nadie queda trabado: sin localidades con nombre el departamento no se ofrece, salvo Montevideo', () => {
  const centros = [
    { subsistema: 'CFE', departamento: 'Rocha', localidad: '' },
    { subsistema: 'CFE', departamento: 'Salto', localidad: '' },
    { subsistema: 'CFE', departamento: 'Salto', localidad: 'Salto' },
    { subsistema: 'CFE', departamento: 'Montevideo', localidad: '' },
  ];
  assert.deepStrictEqual(aPlano(b.departamentosDe(centros, 'CFE')), ['Montevideo', 'Salto']);
});

test('las localidades no incluyen vacíos y todas tienen centros', () => {
  const centros = [
    { subsistema: 'DGES', departamento: 'Rocha', localidad: 'Chuy' },
    { subsistema: 'DGES', departamento: 'Rocha', localidad: '' },
    { subsistema: 'DGES', departamento: 'Rocha', localidad: 'Castillos' },
    { subsistema: 'DGES', departamento: 'Rocha', localidad: 'Chuy' },
    { subsistema: 'CFE', departamento: 'Rocha', localidad: 'Lascano' },
  ];
  assert.deepStrictEqual(aPlano(b.localidadesDe(centros, 'DGES', 'Rocha')), ['Castillos', 'Chuy']);
});

test('los candidatos: en Montevideo todo el departamento, en el resto la localidad', () => {
  const mvd = b.candidatosDe(CATALOGO, 'DGEIP', 'Montevideo', '');
  assert.ok(mvd.length > 1);
  assert.ok(new Set(aPlano(mvd).map(c => c.localidad)).size > 1, 'Montevideo no filtra por barrio');
  const can = CATALOGO.find(c => c.departamento === 'Canelones');
  const enLocalidad = b.candidatosDe(CATALOGO, can.subsistema, 'Canelones', can.localidad);
  assert.ok(enLocalidad.every(c => c.localidad === can.localidad));
});

test('el buscador encuentra por número y con las abreviaturas de siempre', () => {
  const mvd = b.candidatosDe(CATALOGO, 'DGEIP', 'Montevideo', '');
  for (const consulta of ['escuela 35', 'esc 35', 'Esc. 35', 'ESCUELA Nº 35', 'escuela nro 35', '35']) {
    const r = b.buscarCentros(mvd, consulta);
    assert.ok(r.length > 0, consulta);
    assert.strictEqual(r[0].numero, 35, consulta);
    assert.notStrictEqual(r[0].tipo, 'anexo', `${consulta}: la escuela va antes que el anexo`);
  }
});

test('el buscador encuentra por nombre, tolera errores de tipeo y pone primero los anexos solo si se piden', () => {
  const mvd = b.candidatosDe(CATALOGO, 'DGEIP', 'Montevideo', '');
  assert.ok(b.buscarCentros(mvd, 'islandia').some(c => /Islandia/i.test(c.visible)));
  assert.ok(b.buscarCentros(mvd, 'islandya').some(c => /Islandia/i.test(c.visible)));
  assert.strictEqual(b.buscarCentros(mvd, 'anexo 35')[0].tipo, 'anexo');
});

test('el buscador encuentra por código y no inventa resultados', () => {
  const mvd = b.candidatosDe(CATALOGO, 'DGEIP', 'Montevideo', '');
  const uno = CATALOGO.find(c => c.subsistema === 'DGEIP' && c.departamento === 'Montevideo');
  assert.strictEqual(b.buscarCentros(mvd, String(uno.codigo))[0].codigo, uno.codigo);
  assert.deepStrictEqual(aPlano(b.buscarCentros(mvd, 'zzzzzzzz')), []);
  assert.deepStrictEqual(aPlano(b.buscarCentros(mvd, 'escuela 99999')), []);
});

test('un número seguido de un mes es parte del nombre, no el número del centro', () => {
  const liceo = { codigo: 1, visible: 'Liceo 25 de Mayo', tipo: 'lic', numero: null, normalizado: b.normalizarTexto('Liceo 25 de Mayo'), localidadClave: 'florida' };
  const otro = { codigo: 2, visible: 'Liceo Nº 25', tipo: 'lic', numero: 25, normalizado: b.normalizarTexto('Liceo Nº 25'), localidadClave: 'florida' };
  assert.strictEqual(n.limpiarUniverso_([{ 'Código Ceibal': 5, 'Nombre Dependencia': 'LICEO 25 DE MAYO', Rubro: 'DGES', 'Tipo dependencia': 'Liceo Público', Departamento: 'FLORIDA', Localidad: 'Florida' }]).centros[0].numero, null);
  for (const consulta of ['liceo 25 de mayo', '25 de mayo', 'Liceo 25 de Mayo']) assert.strictEqual(b.buscarCentros([otro, liceo], consulta)[0].codigo, 1, consulta);
  assert.strictEqual(b.buscarCentros([otro, liceo], 'liceo 25')[0].codigo, 2);
  const conFecha = { codigo: 3, visible: 'Escuela Nº 7', tipo: 'esc', numero: 7, normalizado: 'escuela 7', localidadClave: '18 de mayo' };
  assert.strictEqual(b.buscarCentros([conFecha], '18 de mayo')[0].codigo, 3);
});

test('el número pegado a la palabra también se encuentra', () => {
  const mvd = b.candidatosDe(CATALOGO, 'DGEIP', 'Montevideo', '');
  for (const consulta of ['esc35', 'n35', 'Nº35', 'escuela35']) assert.strictEqual(b.buscarCentros(mvd, consulta)[0].numero, 35, consulta);
});

test('sin texto muestra primero los centros de aula y un máximo de 12', () => {
  const muchos = [];
  for (let i = 1; i <= 20; i++) muchos.push({ codigo: i, visible: 'Inspección ' + i, tipo: 'otro', numero: null, normalizado: '', localidadClave: '' });
  muchos.push({ codigo: 100, visible: 'Anexo', tipo: 'anexo', numero: 1, normalizado: '', localidadClave: '' });
  muchos.push({ codigo: 101, visible: 'Escuela Nº 2', tipo: 'esc', numero: 2, normalizado: '', localidadClave: '' });
  const r = b.buscarCentros(muchos, '   ');
  assert.strictEqual(r.length, 12);
  assert.strictEqual(r[0].codigo, 101);
  assert.strictEqual(r[1].codigo, 100);
});

// --- Envío: lo que arma la página lo acepta el servidor ---

function estadoCompleto(centro) {
  const e = b.estadoVacio(1000);
  return Object.assign(e, {
    nombre: '  Ana   Pérez ', cedula: '1.234.567-2', email: ' Ana@Ejemplo.COM ',
    subsistema: centro.subsistema, departamento: centro.departamento, localidad: centro.localidad,
    centroCodigo: centro.codigo, centroTexto: 'lo que escribió', ctx: [0, 3, 4], r: Array(15).fill(3),
  });
}

test('el envío que arma la página pasa la validación del servidor en todos los casos', () => {
  const montevideo = VALIDOS.find(c => c.departamento === 'Montevideo');
  const interior = VALIDOS.find(c => c.departamento !== 'Montevideo' && c.localidad);
  for (const centro of [montevideo, interior]) {
    const envio = aPlano(b.armarEnvio(estadoCompleto(CATALOGO.find(c => c.codigo === centro.codigo)), ''));
    const r = n.validarEnvio_(envio, VALIDOS);
    assert.ok(r.ok, JSON.stringify(r));
    assert.strictEqual(r.datos.nombre, 'Ana Pérez');
    assert.strictEqual(r.datos.email, 'ana@ejemplo.com');
    assert.deepStrictEqual(r.datos.ctx, [1, 4, 5]);
    assert.strictEqual(r.datos.origenMacheo, 'elegido por docente');
    assert.strictEqual(n.envioDescartado_(envio, 1000 + 60000, 60), false);
    assert.strictEqual(n.envioDescartado_(envio, 1000 + 59000, 60), true);
  }
});

test('en Montevideo no se manda localidad y "No encuentro mi centro" manda código nulo', () => {
  const c = CATALOGO.find(x => x.departamento === 'Montevideo');
  const e = Object.assign(estadoCompleto(c), { localidad: 'quedó de antes', centroLibre: true, centroCodigo: 999, centroTexto: 'Mi escuela rural' });
  const envio = aPlano(b.armarEnvio(e, 'x'));
  assert.strictEqual(envio.localidad, '');
  assert.strictEqual(envio.centroCodigo, null);
  assert.strictEqual(envio.trampa, 'x');
  const r = n.validarEnvio_(envio, VALIDOS);
  assert.ok(r.ok);
  assert.strictEqual(r.datos.origenMacheo, 'pendiente de revisión');
});

test('un nombre pegado con caracteres invisibles no hace rechazar el envío', () => {
  const c = CATALOGO.find(x => x.departamento === 'Montevideo');
  const e = Object.assign(estadoCompleto(c), { nombre: 'Ana​ Pérez‮' });
  assert.ok(n.validarEnvio_(aPlano(b.armarEnvio(e, '')), VALIDOS).ok);
});

test('nombreValido coincide con lo que acepta el servidor', () => {
  const c = VALIDOS.find(x => x.departamento === 'Montevideo');
  for (const nombre of ['Ana Pérez', 'Ana', 'A B', 'a', '', '   ', 'x'.repeat(119) + ' y', 'x'.repeat(120) + ' y', 'Ana  Pérez']) {
    const envio = Object.assign(aPlano(b.armarEnvio(estadoCompleto(CATALOGO.find(x => x.codigo === c.codigo)), '')), { nombre: b.textoProlijo(nombre) });
    assert.strictEqual(b.nombreValido(nombre), n.validarEnvio_(envio, VALIDOS).ok, nombre);
  }
});

test('formatearCedula pone puntos y guion', () => {
  assert.strictEqual(b.formatearCedula('12345672'), '1.234.567-2');
  assert.strictEqual(b.formatearCedula('1234567'), '123.456-7');
  assert.strictEqual(b.formatearCedula('1'), '1');
  assert.strictEqual(b.formatearCedula(''), '');
  assert.ok(n.cedulaValida_(b.formatearCedula('12345672')));
});

// --- Avance guardado en la pestaña ---

const conVersion = (e, cambios = {}) => JSON.stringify(Object.assign({ versionInstrumento: '2026.1' }, e, cambios));

test('el avance guardado se recupera con lo que ya respondió', () => {
  const c = CATALOGO.find(x => x.departamento === 'Montevideo');
  const e = Object.assign(estadoCompleto(c), { paso: 2 });
  const r = aPlano(b.restaurarAvance(conVersion(e), CATALOGO, '2026.1', 2000));
  assert.deepStrictEqual(r, aPlano(e));
  assert.strictEqual(r.abiertoEn, 1000, 'conserva la hora en que se abrió');
});

test('un avance roto, viejo o de otra versión se descarta', () => {
  const c = CATALOGO.find(x => x.departamento === 'Montevideo');
  const e = estadoCompleto(c);
  const casos = [
    'no es json', 'null', '5', '{}',
    conVersion(e, { versionInstrumento: '2020.1' }),
    conVersion(e, { paso: 7 }), conVersion(e, { paso: -1 }), conVersion(e, { paso: 'x' }),
    conVersion(e, { r: [1, 2] }), conVersion(e, { r: Array(15).fill(9) }),
    conVersion(e, { ctx: [9, 0, 0] }), conVersion(e, { ctx: 'x' }),
    conVersion(e, { nombre: 5 }), conVersion(e, { nombre: 'x'.repeat(301) }),
    conVersion(e, { abiertoEn: 'ayer' }), conVersion(e, { abiertoEn: null }),
  ];
  for (const caso of casos) assert.strictEqual(b.restaurarAvance(caso, CATALOGO, '2026.1', 2000), null, caso.slice(0, 60));
});

test('un avance de más de 6 horas se descarta, para no recuperar datos ajenos en una computadora compartida', () => {
  const c = CATALOGO.find(x => x.departamento === 'Montevideo');
  const texto = conVersion(estadoCompleto(c));
  const seisHoras = 6 * 60 * 60 * 1000;
  assert.notStrictEqual(b.restaurarAvance(texto, CATALOGO, '2026.1', 1000 + seisHoras), null);
  assert.strictEqual(b.restaurarAvance(texto, CATALOGO, '2026.1', 1000 + seisHoras + 1), null);
});

test('si la localidad o el departamento ya no se pueden elegir, se vuelven a elegir desde la primera página', () => {
  const interior = CATALOGO.find(x => x.departamento !== 'Montevideo' && x.localidad);
  const e = Object.assign(estadoCompleto(interior), { paso: 2, localidad: 'Localidad que ya no existe', centroLibre: true, centroCodigo: null, centroTexto: 'Mi centro' });
  const r = b.restaurarAvance(conVersion(e), CATALOGO, '2026.1', 2000);
  assert.strictEqual(r.localidad, '');
  assert.strictEqual(r.centroLibre, false);
  assert.strictEqual(r.paso, 0);
  const d = Object.assign(estadoCompleto(interior), { paso: 1, departamento: 'Inventado' });
  const r2 = b.restaurarAvance(conVersion(d), CATALOGO, '2026.1', 2000);
  assert.strictEqual(r2.departamento, '');
  assert.strictEqual(r2.paso, 0);
});

test('si el centro guardado ya no está en el catálogo, se vuelve a la primera página a elegirlo', () => {
  const c = CATALOGO.find(x => x.departamento === 'Montevideo');
  const e = Object.assign(estadoCompleto(c), { paso: 2, centroCodigo: 99999999 });
  const r = b.restaurarAvance(conVersion(e), CATALOGO, '2026.1', 2000);
  assert.strictEqual(r.centroCodigo, null);
  assert.strictEqual(r.centroTexto, '');
  assert.strictEqual(r.paso, 0);
  const libre = Object.assign(estadoCompleto(c), { paso: 1, centroCodigo: null, centroLibre: true, centroTexto: 'Mi escuela' });
  const r2 = b.restaurarAvance(conVersion(libre), CATALOGO, '2026.1', 2000);
  assert.strictEqual(r2.paso, 1);
  assert.strictEqual(r2.centroTexto, 'Mi escuela');
});

// --- Textos del instrumento en la página ---

test('las afirmaciones, las preguntas de contexto y sus opciones coinciden con docs/INSTRUMENTO.md', () => {
  const md = fs.readFileSync(path.join(__dirname, '..', 'docs', 'INSTRUMENTO.md'), 'utf8').replace(/\r\n/g, '\n');
  const app = leer('app.html');
  const seccion = (desde, hasta) => md.slice(md.indexOf(desde), md.indexOf(hasta));
  const afirmaciones = [...seccion('## Afirmaciones', '## Puntaje').matchAll(/^\d+\. (.+)$/gm)].map(m => m[1]);
  assert.strictEqual(afirmaciones.length, 15);
  const contexto = seccion('## Preguntas de contexto', '## Afirmaciones');
  const opciones = [...contexto.matchAll(/^\d+\. (.+)$/gm)].map(m => m[1]);
  const preguntas = [...contexto.matchAll(/^\*\*ctx_\d\. (.+)\*\*$/gm)].map(m => m[1]);
  assert.strictEqual(opciones.length, 14);
  assert.strictEqual(preguntas.length, 3);
  for (const t of [...afirmaciones, ...opciones, ...preguntas]) assert.ok(app.includes(`'${t}'`), `falta en app.html: ${t}`);
  // Mismo orden: cada afirmación aparece después de la anterior.
  let posicion = -1;
  for (const t of afirmaciones) {
    const p = app.indexOf(`'${t}'`);
    assert.ok(p > posicion, `fuera de orden: ${t}`);
    posicion = p;
  }
});

test('la página ofrece los subsistemas, la escala y las opciones de contexto que acepta el servidor', () => {
  const app = leer('app.html');
  for (const s of ['DGEIP', 'DGES', 'DGETP', 'CFE']) assert.ok(app.includes(`'${s}'`), s);
  assert.ok(app.includes("var ESCALA = ['Nada', 'Poco', 'En parte', 'Bastante', 'Mucho'];"), 'la escala de docs/INSTRUMENTO.md');
  const bloque = /var CONTEXTO = (\[[\s\S]*?\n {2}\]);/.exec(app)[1];
  const contexto = vm.runInNewContext(`(${bloque})`);
  assert.deepStrictEqual(aPlano(contexto.map(c => c.opciones.length)), n.OPCIONES_CONTEXTO_);
});

test('los textos de la Sheet que usa la página existen en la carga inicial', () => {
  const { TEXTOS_INICIALES_ } = require('../src/textos.js');
  for (const clave of ['intro_1', 'intro_2', 'ctx_intro', 'afirmaciones_intro', 'proximo_paso_todas_consolidadas', 'cierre_titulo', 'cierre_1', 'cierre_2', 'rec_rotulo_f', 'rec_rotulo_d', 'rec_rotulo_c']) {
    assert.ok(leer('app.html').includes(`'${clave}'`) || (/^rec_rotulo_/.test(clave) && leer('app.html').includes("'rec_rotulo_' + d.nivel")), `app.html no usa ${clave}`);
    assert.ok(TEXTOS_INICIALES_[clave], clave);
  }
  for (const d of ['d1', 'd2', 'd3', 'd4', 'd5']) {
    for (const sufijo of ['nombre', 'observa', 'f_texto', 'f_rec', 'd_texto', 'd_rec', 'c_texto', 'c_rec']) assert.ok(TEXTOS_INICIALES_[`${d}_${sufijo}`], `${d}_${sufijo}`);
  }
});
