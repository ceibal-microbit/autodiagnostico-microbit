const test = require('node:test');
const assert = require('node:assert');
const n = require('../src/nucleo.js');
const universo = require('./fixtures/universo-sintetico.json');

const { centros } = n.limpiarUniverso_(universo.filas);

// Envío válido de base: se le cambia un campo por vez en cada prueba.
function envioValido(cambios) {
  return Object.assign({
    nombre: 'Ana Pérez',
    cedula: '1.234.567-2',
    email: 'Ana.Perez@Gmail.com',
    subsistema: 'DGEIP',
    departamento: 'Canelones',
    localidad: 'El Pinar',
    centroCodigo: 1103302,
    centroTexto: 'jardin 302',
    ctx: [3, 2, 4],
    r: [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
    abiertoEn: 1700000000000,
    trampa: '',
  }, cambios);
}

function rechazado(cambios, campo) {
  const r = n.validarEnvio_(envioValido(cambios), centros);
  assert.strictEqual(r.ok, false, `debía rechazar ${JSON.stringify(cambios).slice(0, 80)}`);
  if (campo) assert.strictEqual(r.campo, campo);
  assert.deepStrictEqual(Object.keys(r).sort(), ['campo', 'ok']); // sin datos ni detalles internos
}

test('un envío válido se acepta y se devuelve limpio', () => {
  const r = n.validarEnvio_(envioValido(), centros);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.datos.nombre, 'Ana Pérez');
  assert.strictEqual(r.datos.cedula, '12345672');
  assert.strictEqual(r.datos.email, 'ana.perez@gmail.com');
  assert.strictEqual(r.datos.centroCodigo, 1103302);
  assert.strictEqual(r.datos.origenMacheo, 'elegido por docente');
});

test('el perfil lo calcula el servidor a partir de las respuestas', () => {
  const r = n.validarEnvio_(envioValido(), centros);
  assert.deepStrictEqual(r.datos.perfil, n.calcularPerfil_(envioValido().r));
});

test('los campos desconocidos y los que calculó la página se ignoran', () => {
  const r = n.validarEnvio_(envioValido({ perfil: { dimensiones: [] }, nivel: 'c', admin: true, __proto__: { x: 1 } }), centros);
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(Object.keys(r.datos).sort(), [
    'cedula', 'centroCodigo', 'centroTexto', 'ctx', 'departamento', 'email', 'localidad',
    'nombre', 'origenMacheo', 'perfil', 'r', 'subsistema',
  ]);
  assert.notStrictEqual(r.datos.perfil.dimensiones.length, 0);
});

test('no se acepta nada que no sea un objeto', () => {
  for (const x of [null, undefined, 'texto', 5, [], true]) assert.strictEqual(n.validarEnvio_(x, centros).ok, false);
  assert.strictEqual(n.validarEnvio_(envioValido(), null).ok, false);
  assert.strictEqual(n.validarEnvio_(envioValido(), 'x').ok, false);
});

test('nombre: 3 a 120 caracteres y al menos dos palabras', () => {
  rechazado({ nombre: 'Ana' }, 'nombre');
  rechazado({ nombre: 'Al' }, 'nombre');
  rechazado({ nombre: '' }, 'nombre');
  rechazado({ nombre: '   ' }, 'nombre');
  rechazado({ nombre: 'x'.repeat(121) + ' y' }, 'nombre');
  rechazado({ nombre: 'Ana\u0000 Pérez' }, 'nombre');
  rechazado({ nombre: 'Ana\nPérez\r\nBcc: otro@x.com' }, 'nombre');
  rechazado({ nombre: 'a'.repeat(50000) }, 'nombre');
  rechazado({ nombre: 12345 }, 'nombre');
  rechazado({ nombre: null }, 'nombre');
  rechazado({ nombre: ['Ana', 'Pérez'] }, 'nombre');
  const limite = 'a'.repeat(60) + ' ' + 'b'.repeat(59);
  assert.strictEqual(n.validarEnvio_(envioValido({ nombre: limite }), centros).ok, true);
  assert.strictEqual(n.validarEnvio_(envioValido({ nombre: '  Ana    María   Pérez ' }), centros).datos.nombre, 'Ana María Pérez');
});

test('el nombre con una fórmula o HTML se acepta como texto (se protege al guardar y al mostrar)', () => {
  const r = n.validarEnvio_(envioValido({ nombre: '=IMAGE("https://example.com/x.png") x' }), centros);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(n.protegerFormula_(r.datos.nombre), "'=IMAGE(\"https://example.com/x.png\") x");
});

test('cédula: formato y dígito verificador', () => {
  rechazado({ cedula: '12345673' }, 'cedula');
  rechazado({ cedula: '123' }, 'cedula');
  rechazado({ cedula: '' }, 'cedula');
  rechazado({ cedula: 12345672 }, 'cedula');
  rechazado({ cedula: null }, 'cedula');
  rechazado({ cedula: '1234567-2; DROP' }, 'cedula');
});

test('correo: formato y máximo 254 caracteres', () => {
  rechazado({ email: 'ana' }, 'email');
  rechazado({ email: 'ana@gmail' }, 'email');
  rechazado({ email: 'a'.repeat(250) + '@x.com' }, 'email');
  rechazado({ email: 'ana@gmail.com\nBcc: x@y.com' }, 'email');
  rechazado({ email: null }, 'email');
  rechazado({ email: 5 }, 'email');
  assert.strictEqual(n.validarEnvio_(envioValido({ email: '  ana@ceibal.edu.uy ' }), centros).datos.email, 'ana@ceibal.edu.uy');
});

test('subsistema: DGEIP, DGES, DGETP o CFE', () => {
  rechazado({ subsistema: 'dgeip' }, 'subsistema');
  rechazado({ subsistema: 'OTRO' }, 'subsistema');
  rechazado({ subsistema: '' }, 'subsistema');
  rechazado({ subsistema: null }, 'subsistema');
  rechazado({ subsistema: ['DGEIP'] }, 'subsistema');
});

test('departamento: tiene que existir en Centros para ese subsistema', () => {
  rechazado({ departamento: 'Narnia' }, 'departamento');
  rechazado({ departamento: 'canelones' }, 'departamento');
  rechazado({ departamento: 'Rocha', subsistema: 'DGES', centroCodigo: null, centroTexto: 'Liceo de Rocha' }, 'departamento');
  rechazado({ departamento: null }, 'departamento');
  rechazado({ departamento: 5 }, 'departamento');
});

test('localidad: obligatoria y existente fuera de Montevideo', () => {
  rechazado({ localidad: '' }, 'localidad');
  rechazado({ localidad: null }, 'localidad');
});

test('localidad: debe ser una de ese subsistema y departamento', () => {
  assert.strictEqual(n.validarEnvio_(envioValido({ localidad: 'Pando', centroCodigo: 1103045, centroTexto: '' }), centros).ok, true);
  rechazado({ localidad: 'Rocha' }, 'localidad');
  rechazado({ localidad: 'Tala' }, 'localidad'); // Tala existe en Canelones, pero solo para DGES y DGETP
  rechazado({ localidad: 5 }, 'localidad');
});

test('localidad: vacía en Montevideo', () => {
  const montevideo = { departamento: 'Montevideo', localidad: '', centroCodigo: 1101035, centroTexto: 'islandia' };
  assert.strictEqual(n.validarEnvio_(envioValido(montevideo), centros).ok, true);
  assert.strictEqual(n.validarEnvio_(envioValido(Object.assign({}, montevideo, { localidad: undefined })), centros).ok, true);
  rechazado(Object.assign({}, montevideo, { localidad: 'Buceo' }), 'localidad');
});

test('centro: el código tiene que existir con ese subsistema y departamento', () => {
  rechazado({ centroCodigo: 999999999 }, 'centro');
  rechazado({ centroCodigo: 1101035 }, 'centro'); // existe, pero es de Montevideo
  rechazado({ centroCodigo: 90000011 }, 'centro'); // existe en Canelones, pero es de DGES
  rechazado({ centroCodigo: '1103302' }, 'centro');
  rechazado({ centroCodigo: 1103302.5 }, 'centro');
  rechazado({ centroCodigo: NaN }, 'centro');
  rechazado({ centroCodigo: [1103302] }, 'centro');
  rechazado({ centroCodigo: true }, 'centro');
  rechazado({ centroCodigo: 1103302, centroTexto: 'x'.repeat(151) }, 'centro');
});

test('centro: "No encuentro mi centro" guarda el texto libre (3 a 150 caracteres) marcado para revisión', () => {
  const r = n.validarEnvio_(envioValido({ centroCodigo: null, centroTexto: '  Escuela   del pueblo ' }), centros);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.datos.centroCodigo, null);
  assert.strictEqual(r.datos.centroTexto, 'Escuela del pueblo');
  assert.strictEqual(r.datos.origenMacheo, 'pendiente de revisión');
  rechazado({ centroCodigo: null, centroTexto: 'ab' }, 'centro');
  rechazado({ centroCodigo: null, centroTexto: '' }, 'centro');
  rechazado({ centroCodigo: null, centroTexto: null }, 'centro');
  rechazado({ centroCodigo: null, centroTexto: 'x'.repeat(151) }, 'centro');
  rechazado({ centroCodigo: null, centroTexto: 'x'.repeat(50000) }, 'centro');
  rechazado({ centroCodigo: null, centroTexto: 'Escuela\u0007' }, 'centro');
  assert.strictEqual(n.validarEnvio_(envioValido({ centroCodigo: null, centroTexto: 'x'.repeat(150) }), centros).ok, true);
});

test('contexto: tres enteros dentro de las opciones de cada pregunta', () => {
  assert.strictEqual(n.validarEnvio_(envioValido({ ctx: [5, 4, 5] }), centros).ok, true);
  assert.strictEqual(n.validarEnvio_(envioValido({ ctx: [1, 1, 1] }), centros).ok, true);
  for (const ctx of [[0, 1, 1], [6, 1, 1], [1, 5, 1], [1, 1, 6], [1, 1], [1, 1, 1, 1], [1.5, 1, 1], ['1', 1, 1], [null, 1, 1], 'x', null, [-1, 1, 1]]) {
    rechazado({ ctx: ctx }, 'ctx');
  }
});

test('afirmaciones: exactamente 15 enteros de 1 a 5', () => {
  const quince = valor => Array(15).fill(valor);
  assert.strictEqual(n.validarEnvio_(envioValido({ r: quince(1) }), centros).ok, true);
  assert.strictEqual(n.validarEnvio_(envioValido({ r: quince(5) }), centros).ok, true);
  const conUno = valor => envioValido().r.map((v, i) => (i === 7 ? valor : v));
  for (const valor of [0, 6, 7, -1, 2.5, '3', null, NaN, Infinity, true, [3]]) rechazado({ r: conUno(valor) }, 'r');
  rechazado({ r: quince(3).slice(0, 14) }, 'r');
  rechazado({ r: quince(3).concat([3]) }, 'r');
  rechazado({ r: [] }, 'r');
  rechazado({ r: 'x' }, 'r');
  rechazado({ r: null }, 'r');
  rechazado({ r: undefined }, 'r');
});

test('un envío con una sola falla se rechaza completo', () => {
  rechazado({ r: envioValido().r.map((v, i) => (i === 0 ? 7 : v)) });
});

test('el resultado no cambia el envío original', () => {
  const envio = envioValido();
  const copia = JSON.stringify(envio);
  const r = n.validarEnvio_(envio, centros);
  assert.strictEqual(JSON.stringify(envio), copia);
  r.datos.r[0] = 5;
  r.datos.ctx[0] = 5;
  assert.strictEqual(JSON.stringify(envio), copia);
});

test('un catálogo con filas rotas no hace saltar errores: se rechaza', () => {
  const r = n.validarEnvio_(envioValido(), [null, undefined]);
  assert.strictEqual(r.ok, false);
});
