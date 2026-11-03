// Controles automáticos de las reglas de CLAUDE.md y docs/SEGURIDAD.md que se pueden verificar en el código.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const archivosJs = fs.readdirSync(SRC).filter(f => f.endsWith('.js'));

test('solo las funciones permitidas son públicas (las demás terminan en guion bajo)', () => {
  const permitidas = new Set(['doGet', 'obtenerDatosIniciales', 'guardarRespuesta', 'onOpen']);
  const publicasDeMas = [];
  for (const f of archivosJs) {
    const codigo = fs.readFileSync(path.join(SRC, f), 'utf8');
    for (const m of codigo.matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/gm)) {
      const nombre = m[1];
      if (!nombre.endsWith('_') && !permitidas.has(nombre)) publicasDeMas.push(`${f}: ${nombre}`);
    }
  }
  // nucleo.js puede tener funciones públicas en Node, pero en Apps Script también serían llamables:
  // por eso la regla aplica a todos los archivos de src/.
  assert.deepStrictEqual(publicasDeMas, [], 'Funciones públicas no permitidas: renombrarlas con _ al final');
});

test('src/ no usa require, import ni export (no existen en Apps Script)', () => {
  for (const f of archivosJs) {
    const codigo = fs.readFileSync(path.join(SRC, f), 'utf8')
      .replace(/if \(typeof module !== 'undefined'\) \{[\s\S]*?\}\s*$/, ''); // bloque de exportación para tests
    assert.ok(!/\brequire\s*\(/.test(codigo), `${f} usa require`);
    assert.ok(!/^\s*(import|export)\s/m.test(codigo), `${f} usa import/export`);
  }
});

test('el manifiesto pide solo los permisos documentados', () => {
  const manifiesto = JSON.parse(fs.readFileSync(path.join(SRC, 'appsscript.json'), 'utf8'));
  assert.deepStrictEqual([...manifiesto.oauthScopes].sort(), [
    'https://www.googleapis.com/auth/script.container.ui',
    'https://www.googleapis.com/auth/script.send_mail',
    'https://www.googleapis.com/auth/spreadsheets.currentonly',
  ]);
  assert.strictEqual(manifiesto.webapp.executeAs, 'USER_DEPLOYING');
  assert.strictEqual(manifiesto.webapp.access, 'ANYONE_ANONYMOUS');
});
