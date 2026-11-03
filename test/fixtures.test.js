// Controla que los datos de prueba sean coherentes (y sintéticos).
const test = require('node:test');
const assert = require('node:assert');
const universo = require('./fixtures/universo-sintetico.json');
const { casos } = require('./fixtures/casos-macheo.json');

test('el catálogo sintético tiene las columnas de la hoja Universo', () => {
  assert.deepStrictEqual(universo.columnas, ['Código Ceibal', 'Nombre Dependencia', 'Rubro', 'Tipo dependencia', 'Departamento', 'Localidad']);
});

test('el catálogo sintético incluye los problemas que la limpieza debe resolver', () => {
  const f = universo.filas;
  const codigos = f.map(x => x['Código Ceibal']);
  assert.ok(codigos.length > new Set(codigos).size, 'faltan filas duplicadas');
  assert.ok(f.some(x => /^\d{4}-\d{2}-\d{2}/.test(x.Localidad || '')), 'faltan localidades convertidas en fecha');
  assert.ok(f.some(x => !x.Departamento), 'falta una fila sin departamento');
  assert.ok(f.some(x => x.Departamento === 'Asunción'), 'falta un departamento fuera de Uruguay');
});

test('cada caso de macheo espera un código que existe en el catálogo', () => {
  const codigos = new Set(universo.filas.map(x => x['Código Ceibal']));
  for (const c of casos) {
    if (c.esperado !== null) assert.ok(codigos.has(c.esperado), `${c.texto}: código ${c.esperado} no está en el catálogo`);
    assert.ok(['automatico', 'revisar'].includes(c.estado));
    assert.strictEqual(c.esperado === null, c.estado === 'revisar', `${c.texto}: estado y esperado no coinciden`);
  }
});
