const test = require('node:test');
const assert = require('node:assert');
const n = require('../src/nucleo.js');

// Cédulas de prueba construidas con la fórmula conocida (no son de personas reales).
function conDigito(base) {
  const completa = base.padStart(7, '0');
  const pesos = [2, 9, 8, 7, 6, 3, 4];
  const suma = [...completa].reduce((acc, c, i) => acc + Number(c) * pesos[i], 0);
  return base + String((10 - (suma % 10)) % 10);
}

test('cédula: ejemplo conocido 1.234.567-2', () => {
  assert.ok(n.cedulaValida_('12345672'));
  assert.ok(n.cedulaValida_('1.234.567-2'));
  assert.ok(n.cedulaValida_(' 1234567-2 '));
});

test('cédula: dígito verificador incorrecto', () => {
  for (const d of '013456789') assert.ok(!n.cedulaValida_('1234567' + d), `dígito ${d}`);
});

test('cédula: 8 dígitos y 7 dígitos (antiguas) con dígito correcto', () => {
  for (const base of ['4567890', '2345678', '1000000', '3999999']) assert.ok(n.cedulaValida_(conDigito(base)), base);
  for (const base of ['123456', '234567', '999999']) assert.ok(n.cedulaValida_(conDigito(base)), base);
});

test('cédula: formato inválido', () => {
  const malas = ['', '123456', '123456789', 'abcdefgh', '1234567a', '12 34', null, undefined, 12345672, {}, [], '1234567\n2x', '١٢٣٤٥٦٧٢'];
  for (const m of malas) assert.ok(!n.cedulaValida_(m), `debía rechazar ${JSON.stringify(m)}`);
});

test('limpiarCedula_ deja solo los dígitos', () => {
  assert.strictEqual(n.limpiarCedula_('1.234.567-2'), '12345672');
  assert.strictEqual(n.limpiarCedula_('x'), null);
  assert.strictEqual(n.limpiarCedula_('1'.repeat(100)), null);
});

test('correo: formatos válidos', () => {
  for (const c of ['ana@ceibal.edu.uy', 'ana.perez+micro@gmail.com', 'a_b-c@sub.dominio.com.uy', "o'brien@dominio.org"]) assert.ok(n.correoValido_(c), c);
});

test('correo: formatos inválidos', () => {
  const malos = [
    '', 'ana', 'ana@', '@gmail.com', 'ana@gmail', 'ana@@gmail.com', 'ana perez@gmail.com', 'ana..perez@gmail.com',
    '.ana@gmail.com', 'ana.@gmail.com', 'ana@-gmail.com', 'ana@gmail.c', 'ana@gmail.com\n', 'ana@gmail.com\r\nBcc: x@y.com',
    'a'.repeat(65) + '@gmail.com', 'a@' + 'b'.repeat(250) + '.com', null, undefined, 5, {},
  ];
  for (const m of malos) assert.ok(!n.correoValido_(m), `debía rechazar ${JSON.stringify(m)}`);
});

test('correo: máximo 254 caracteres', () => {
  const limite = 'a'.repeat(60) + '@' + 'b'.repeat(60) + '.' + 'c'.repeat(60) + '.' + 'd'.repeat(60) + '.com';
  assert.ok(limite.length <= 254 && n.correoValido_(limite));
  const largo = 'a'.repeat(60) + '@' + ('b'.repeat(60) + '.').repeat(4) + 'c'.repeat(60) + '.com';
  assert.ok(largo.length > 254);
  assert.ok(!n.correoValido_(largo));
});

test('sugerencia de dominio: errores de tipeo comunes', () => {
  const casos = {
    'ana@gmial.com': 'ana@gmail.com',
    'ana@gmai.com': 'ana@gmail.com',
    'ana@gnail.com': 'ana@gmail.com',
    'ana@gmail.con': 'ana@gmail.com',
    'ana@hotmial.com': 'ana@hotmail.com',
    'ana@ceibal.edu.yu': 'ana@ceibal.edu.uy',
    'Ana@Gmial.com': 'Ana@gmail.com',
  };
  for (const [entrada, esperado] of Object.entries(casos)) assert.strictEqual(n.sugerirCorreo_(entrada), esperado, entrada);
});

test('sugerencia de dominio: sin sugerencia cuando el dominio ya es correcto o distinto', () => {
  for (const c of ['ana@gmail.com', 'ana@ceibal.edu.uy', 'ana@escuela.edu.uy', 'ana@miempresa.com', 'no es correo', null]) {
    assert.strictEqual(n.sugerirCorreo_(c), null, String(c));
  }
});
