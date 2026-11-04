// Controles automáticos de las reglas de CLAUDE.md y docs/SEGURIDAD.md que se pueden verificar en el código.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
    // También funciones asignadas a una variable global: const x = function () {} / const x = () => {}
    for (const m of codigo.matchAll(/^(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z0-9_$]+\s*=>)/gm)) {
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

test('los archivos de src/ se pueden cargar en cualquier orden, como en Apps Script', () => {
  // Apps Script no carga nucleo.js primero: al cargarse, un archivo no puede usar nada definido en otro.
  // Cada archivo se ejecuta por separado en un mismo espacio global, sin servicios de Google.
  const ordenes = lista => (lista.length < 2 ? [lista] : lista.flatMap((a, i) => ordenes(lista.filter((_, j) => j !== i)).map(resto => [a, ...resto])));
  for (const orden of ordenes(archivosJs)) {
    const contexto = vm.createContext({});
    for (const f of orden) {
      assert.doesNotThrow(() => vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), contexto, { filename: f }), `Falla al cargar ${f} en el orden ${orden.join(', ')}`);
    }
  }
});

const archivosHtml = fs.readdirSync(SRC).filter(f => f.endsWith('.html'));

test('ninguna página interpreta como HTML lo que viene del docente o de la Sheet', () => {
  assert.ok(archivosHtml.length >= 4);
  for (const f of archivosHtml) {
    const codigo = fs.readFileSync(path.join(SRC, f), 'utf8');
    for (const prohibido of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'new Function']) {
      assert.ok(!codigo.includes(prohibido), `${f} usa ${prohibido}`);
    }
    // <?!= no escapa: solo se permite para incluir los parciales propios.
    for (const m of codigo.matchAll(/<\?!=([^?]*)\?>/g)) assert.match(m[1].trim(), /^incluir_\('[a-z]+'\)$/, `${f}: ${m[0]}`);
  }
});

test('el perfil no muestra "Tu próximo paso" ni la barra de promedio, y ningún nivel va relleno', () => {
  for (const f of ['app.html', 'estilos.html']) {
    const codigo = fs.readFileSync(path.join(SRC, f), 'utf8');
    for (const prohibido of ['Tu próximo paso', 'meter-bar', '.chip.c', 'momento actual con micro:bit']) assert.ok(!codigo.includes(prohibido), `${f}: ${prohibido}`);
  }
});

test('los parciales que se incluyen existen', () => {
  const indice = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  for (const m of indice.matchAll(/incluir_\('([a-z]+)'\)/g)) assert.ok(archivosHtml.includes(`${m[1]}.html`), m[1]);
});

test('la página no muestra el nombre de la planilla', () => {
  for (const f of archivosHtml) assert.ok(!/planilla \?>|Planilla vinculada/.test(fs.readFileSync(path.join(SRC, f), 'utf8')), f);
  assert.ok(!fs.readFileSync(path.join(SRC, 'Codigo.js'), 'utf8').includes('getName'));
});

test('fase 4: ningún archivo usa un servicio de correo (no puede salir ningún mail)', () => {
  for (const f of fs.readdirSync(SRC).filter(a => a !== 'appsscript.json')) {
    const codigo = fs.readFileSync(path.join(SRC, f), 'utf8');
    assert.ok(!/\b(MailApp|GmailApp|sendEmail)\b/.test(codigo), `${f} usa un servicio de correo`);
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
