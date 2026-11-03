const test = require('node:test');
const assert = require('node:assert');
const nucleo = require('../src/nucleo.js');

test('VERSION sigue semver', () => {
  assert.match(nucleo.VERSION, /^\d+\.\d+\.\d+$/);
});

test('VERSION de nucleo.js coincide con package.json', () => {
  assert.strictEqual(nucleo.VERSION, require('../package.json').version);
});

// Fase 2: tests de puntajes, cédula, correo, validación, fórmulas, normalización, catálogo y macheo.
