const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { leerConfiguracion } = require('../tools/usar-entorno.js');

// Cada prueba trabaja en una carpeta temporal: nunca toca los .clasp.*.json reales del repo.
function archivoTemporal(contenido, nombre = '.clasp.prueba.json') {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'entorno-'));
  const archivo = path.join(carpeta, nombre);
  if (contenido !== null) fs.writeFileSync(archivo, contenido);
  return archivo;
}

test('un archivo bien formado devuelve scriptId y rootDir', () => {
  const origen = archivoTemporal('{"scriptId": "abc123", "rootDir": "src"}');
  assert.deepStrictEqual(leerConfiguracion(origen), { scriptId: 'abc123', rootDir: 'src' });
});

test('sin rootDir usa src', () => {
  assert.strictEqual(leerConfiguracion(archivoTemporal('{"scriptId": "abc123"}')).rootDir, 'src');
});

test('un JSON con error de formato muestra un mensaje claro en español', () => {
  const origen = archivoTemporal('{"scriptId": "abc123", "rootDir": "src",}');
  assert.throws(() => leerConfiguracion(origen), e => {
    assert.match(e.message, /\.clasp\.prueba\.json no tiene un formato JSON válido/);
    assert.match(e.message, /comas, comillas o llaves/);
    assert.match(e.message, /\.clasp\.prueba\.example\.json/);
    assert.ok(!(e instanceof SyntaxError));
    return true;
  });
});

test('un archivo vacío o con texto cualquiera también da el mensaje claro', () => {
  for (const contenido of ['', 'hola', '{']) {
    assert.throws(() => leerConfiguracion(archivoTemporal(contenido)), /no tiene un formato JSON válido/);
  }
});

test('un JSON válido que no es un objeto da un mensaje claro', () => {
  for (const contenido of ['null', '[]', '"texto"', '5']) {
    assert.throws(() => leerConfiguracion(archivoTemporal(contenido)), /tiene que ser un objeto JSON/);
  }
});

test('el mensaje nombra el entorno correcto', () => {
  const origen = archivoTemporal('{', '.clasp.produccion.json');
  assert.throws(() => leerConfiguracion(origen), /\.clasp\.produccion\.json no tiene un formato JSON válido.*\.clasp\.produccion\.example\.json/);
});

test('falta el archivo o el scriptId sin completar', () => {
  assert.throws(() => leerConfiguracion(archivoTemporal(null)), /Falta \.clasp\.prueba\.json/);
  assert.throws(() => leerConfiguracion(archivoTemporal('{"scriptId": "PEGAR_AQUI_EL_ID"}')), /scriptId .* no está completo/);
  assert.throws(() => leerConfiguracion(archivoTemporal('{"scriptId": 5}')), /no está completo/);
  assert.throws(() => leerConfiguracion(archivoTemporal('{}')), /no está completo/);
});
