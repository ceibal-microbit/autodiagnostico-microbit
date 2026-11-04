// Prueba Codigo.js y la lógica de la web app con una planilla simulada en memoria.
// El simulador no modela lo que Google hace por su cuenta (formatos, fórmulas): eso se prueba a mano
// en la Sheet de prueba (docs/SEGURIDAD.md, sección 9). Nada de esto manda mails ni sale de la computadora.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const universo = require('./fixtures/universo-sintetico.json');
const n = require('../src/nucleo.js');
const { TEXTOS_INICIALES_ } = require('../src/textos.js');

const SRC = path.join(__dirname, '..', 'src');
const codigoFuente = ['nucleo.js', 'Codigo.js'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');

const CENTROS_LIMPIOS = n.limpiarUniverso_(universo.filas).centros;
const VALIDOS = n.centrosDeFilas_([n.COLUMNAS_CENTROS_].concat(CENTROS_LIMPIOS.map(n.centroAFila_)));
const EN_MONTEVIDEO = VALIDOS.find(c => c.departamento === 'Montevideo');
const HACE_DOS_MINUTOS = () => Date.now() - 120000;

function hoja(filas) {
  const datos = filas.map(f => f.slice());
  return {
    datos,
    lecturas: 0,
    getDataRange() { return { getValues: () => datos.map(f => f.slice()) }; },
    getLastRow() { return datos.length; },
    getRange(fila, columna, filasN, columnasN) {
      return { getValues: () => datos.slice(fila - 1, fila - 1 + filasN).map(f => { const c = f.slice(columna - 1, columna - 1 + columnasN); while (c.length < columnasN) c.push(''); return c; }) };
    },
    appendRow(fila) { if (this.fallar) throw new Error('Fallo interno con datos privados'); datos.push(fila.slice()); },
  };
}

function entorno({ config = {}, bloqueoDisponible = true, respuestas = [], centros } = {}) {
  const valoresConfig = Object.assign(Object.fromEntries(n.CONFIG_INICIAL_.map(f => [f[0], f[1]])), config);
  const hojas = {
    Centros: hoja(centros || [n.COLUMNAS_CENTROS_].concat(CENTROS_LIMPIOS.map(n.centroAFila_))),
    Textos: hoja([['clave', 'texto']].concat(Object.entries(TEXTOS_INICIALES_))),
    Config: hoja([['clave', 'valor', 'descripcion']].concat(Object.entries(valoresConfig).map(([k, v]) => [k, v, '']))),
    Respuestas: hoja([n.ENCABEZADOS_RESPUESTAS_].concat(respuestas)),
  };
  const bloqueos = { tomados: 0, liberados: 0 };
  const descargas = [];
  const registro = [];
  const anotar = (...a) => registro.push(a.join(' '));
  const contexto = vm.createContext({
    console: { error: anotar, warn: anotar, log: anotar },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({ getSheetByName: nombre => hojas[nombre] || null, getName: () => 'NOMBRE SECRETO' }),
      flush: () => { descargas.push(hojas.Respuestas.datos.length); },
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => { if (bloqueoDisponible) bloqueos.tomados++; return bloqueoDisponible; },
        releaseLock: () => { bloqueos.liberados++; },
      }),
    },
    HtmlService: {
      createTemplateFromFile: nombre => ({
        nombre,
        evaluate() {
          const salida = { plantilla: this, setTitle(t) { salida.titulo = t; return salida; }, addMetaTag(a, b) { salida.meta = [a, b]; return salida; } };
          return salida;
        },
      }),
    },
  });
  const f = vm.runInContext(codigoFuente + '\n;({ doGet, obtenerDatosIniciales, guardarRespuesta })', contexto);
  return { hojas, bloqueos, registro, descargas, ...f };
}

function envioValido(cambios = {}) {
  return Object.assign({
    nombre: 'Docente de Prueba', cedula: '1.234.567-2', email: 'Docente@Ejemplo.com',
    subsistema: EN_MONTEVIDEO.subsistema, departamento: 'Montevideo', localidad: '',
    centroCodigo: EN_MONTEVIDEO.codigo, centroTexto: 'escuela', ctx: [1, 2, 3],
    r: [4, 4, 3, 2, 2, 1, 3, 3, 2, 5, 4, 4, 2, 3, 3], abiertoEn: HACE_DOS_MINUTOS(), trampa: '',
  }, cambios);
}
const filasGuardadas = e => e.hojas.Respuestas.datos.slice(1);
const columna = nombre => n.ENCABEZADOS_RESPUESTAS_.indexOf(nombre);
const aPlano = v => JSON.parse(JSON.stringify(v));
const RECHAZO = { ok: false, mensaje: 'No pudimos guardar tu respuesta. Intentá más tarde.' };

// --- doGet y obtenerDatosIniciales ---

test('doGet arma la página sin el nombre de la planilla y con viewport para celular', () => {
  const salida = entorno().doGet();
  assert.strictEqual(salida.plantilla.nombre, 'index');
  assert.strictEqual(salida.plantilla.version, n.VERSION);
  assert.strictEqual(salida.plantilla.planilla, undefined);
  assert.deepStrictEqual(salida.meta, ['viewport', 'width=device-width, initial-scale=1']);
});

test('obtenerDatosIniciales devuelve solo las columnas del buscador, los textos y la hora del servidor', () => {
  const antes = Date.now();
  const d = aPlano(entorno().obtenerDatosIniciales());
  assert.deepStrictEqual(Object.keys(d).sort(), ['ahora', 'centros', 'textos', 'version', 'versionInstrumento']);
  assert.strictEqual(d.version, n.VERSION);
  assert.ok(d.ahora >= antes);
  assert.ok(d.centros.length > 0);
  for (const fila of d.centros) assert.strictEqual(fila.length, 8);
  assert.strictEqual(d.textos.d1_nombre, 'Autonomía técnica');
  assert.ok(!('clave' in d.textos));
});

test('obtenerDatosIniciales no ofrece departamentos fuera de Uruguay ni devuelve observaciones ni Respuestas', () => {
  const e = entorno({ respuestas: [['dato privado de un docente']] });
  const d = aPlano(e.obtenerDatosIniciales());
  const texto = JSON.stringify(d);
  assert.ok(!d.centros.some(c => /Asunci|Rio Grande/.test(c[3])));
  assert.ok(CENTROS_LIMPIOS.some(c => /Asunci|Rio Grande/.test(c.departamento)), 'el fixture tiene que traer de esos');
  assert.ok(!texto.includes('dato privado'));
  assert.ok(!texto.includes('observacion'));
});

test('obtenerDatosIniciales quita el apóstrofo de protección de los nombres', () => {
  const fila = n.centroAFila_(Object.assign({}, CENTROS_LIMPIOS.find(c => c.departamento === 'Montevideo'), { nombre_visible: '=Centro raro' }));
  const d = aPlano(entorno({ centros: [n.COLUMNAS_CENTROS_, fila] }).obtenerDatosIniciales());
  assert.strictEqual(fila[n.COLUMNAS_CENTROS_.indexOf('nombre_visible')], "'=Centro raro");
  assert.strictEqual(d.centros[0][1], '=Centro raro');
});

test('si Centros está vacío o falla, obtenerDatosIniciales no da detalles', () => {
  const e = entorno({ centros: [n.COLUMNAS_CENTROS_] });
  assert.deepStrictEqual(aPlano(e.obtenerDatosIniciales()), { error: true });
  assert.ok(e.registro.some(r => /Centros/.test(r)));
});

// --- guardarRespuesta ---

test('un envío válido se guarda como una fila y devuelve solo el perfil de ese envío', () => {
  const e = entorno();
  const r = aPlano(e.guardarRespuesta(envioValido()));
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(Object.keys(r), ['ok', 'perfil']);
  assert.deepStrictEqual(Object.keys(r.perfil), ['dimensiones', 'proximoPaso', 'mailEnviado']);
  assert.strictEqual(r.perfil.mailEnviado, false);
  assert.deepStrictEqual(r.perfil.proximoPaso, ['d2']);
  assert.deepStrictEqual(r.perfil.dimensiones[0], { id: 'd1', suma: 11, promedio: 3.67, nivel: 'd' });
  const filas = filasGuardadas(e);
  assert.strictEqual(filas.length, 1);
  const fila = filas[0];
  assert.strictEqual(fila.length, n.ENCABEZADOS_RESPUESTAS_.length);
  assert.strictEqual(fila[columna('nombre')], 'Docente de Prueba');
  assert.strictEqual(fila[columna('cedula')], '12345672');
  assert.strictEqual(fila[columna('email')], 'docente@ejemplo.com');
  assert.strictEqual(fila[columna('version_app')], n.VERSION);
  assert.strictEqual(fila[columna('centro_codigo')], EN_MONTEVIDEO.codigo);
  assert.strictEqual(fila[columna('origen_macheo')], 'elegido por docente');
  assert.strictEqual(fila[columna('d2_i3')], 1);
  assert.strictEqual(fila[columna('d1_suma')], 11);
  assert.strictEqual(fila[columna('d2_nivel')], 'A fortalecer');
  assert.strictEqual(fila[columna('mail_enviado')], 'no');
  assert.ok(!fila.includes(undefined));
  assert.deepStrictEqual(e.bloqueos, { tomados: 1, liberados: 1 });
  assert.deepStrictEqual(e.descargas, [2], 'la escritura se confirma después de agregar la fila');
});

test('el servidor recalcula: ignora puntajes que mande la página', () => {
  const e = entorno();
  const r = aPlano(e.guardarRespuesta(envioValido({ perfil: { falso: true }, d1_suma: 99, suma: 99 })));
  assert.strictEqual(r.perfil.dimensiones[0].suma, 11);
  assert.strictEqual(filasGuardadas(e)[0][columna('d1_suma')], 11);
});

test('"No encuentro mi centro" guarda el texto como pendiente de revisión, sin macheo', () => {
  const e = entorno();
  e.guardarRespuesta(envioValido({ centroCodigo: null, centroTexto: EN_MONTEVIDEO.nombre_visible }));
  const fila = filasGuardadas(e)[0];
  assert.strictEqual(fila[columna('origen_macheo')], 'pendiente de revisión');
  assert.strictEqual(fila[columna('centro_codigo')], '');
});

test('los textos que empiezan como fórmula se guardan protegidos', () => {
  const e = entorno();
  e.guardarRespuesta(envioValido({ nombre: '=IMAGE("https://example.com/x.png") Apellido', centroCodigo: null, centroTexto: '+centro raro' }));
  const fila = filasGuardadas(e)[0];
  assert.ok(fila[columna('nombre')].startsWith("'="));
  assert.ok(fila[columna('centro_texto')].startsWith("'+"));
});

test('filaDeRespuesta_ protege también el correo y la localidad', () => {
  const datos = n.validarEnvio_(envioValido({ email: '+alias@ejemplo.com' }), VALIDOS).datos;
  const fila = n.filaDeRespuesta_(Object.assign({}, datos, { localidad: '=rara' }), new Date(), 'no');
  assert.strictEqual(fila[columna('email')], "'+alias@ejemplo.com");
  assert.strictEqual(fila[columna('localidad')], "'=rara");
});

test('lo que se le devuelve a la página nunca lleva una fecha, porque haría fallar a google.script.run', () => {
  const filaConFecha = n.centroAFila_(Object.assign({}, CENTROS_LIMPIOS.find(c => c.departamento === 'Montevideo'), { nombre_visible: new Date() }));
  const e = entorno({ centros: [n.COLUMNAS_CENTROS_, filaConFecha] });
  e.hojas.Textos.datos.push(['texto_con_fecha', new Date()]);
  const d = e.obtenerDatosIniciales();
  const hayFecha = v => v !== null && typeof v === 'object' ? (typeof v.getTime === 'function' || Object.values(v).some(hayFecha)) : false;
  assert.strictEqual(hayFecha(d), false);
  assert.strictEqual(typeof d.textos.texto_con_fecha, 'string');
});

test('un texto de la Sheet con HTML llega tal cual: la página es la que lo muestra como texto', () => {
  const e = entorno();
  const ataque = '<img src=x onerror=alert(1)>';
  e.hojas.Textos.datos.push(['texto_raro', ataque]);
  assert.strictEqual(e.obtenerDatosIniciales().textos.texto_raro, ataque);
});

for (const [nombre, cambios] of [
  ['afirmación fuera de escala', { r: [7, 4, 3, 2, 2, 1, 3, 3, 2, 5, 4, 4, 2, 3, 3] }],
  ['afirmación negativa', { r: [-1, 4, 3, 2, 2, 1, 3, 3, 2, 5, 4, 4, 2, 3, 3] }],
  ['centro inventado', { centroCodigo: 99999999 }],
  ['nombre enorme', { nombre: 'a '.repeat(25000) }],
  ['cédula con dígito incorrecto', { cedula: '1.234.567-3' }],
  ['departamento fuera de Uruguay', { departamento: 'Asunción', localidad: 'Asunción', centroCodigo: null, centroTexto: 'un centro' }],
]) {
  test(`se rechaza sin guardar y sin detalles: ${nombre}`, () => {
    const e = entorno();
    assert.deepStrictEqual(aPlano(e.guardarRespuesta(envioValido(cambios))), RECHAZO);
    assert.strictEqual(filasGuardadas(e).length, 0);
    assert.strictEqual(e.bloqueos.tomados, 0);
  });
}

test('un envío que no es un objeto se rechaza', () => {
  for (const valor of [null, undefined, 'hola', 5, []]) assert.deepStrictEqual(aPlano(entorno().guardarRespuesta(valor)), RECHAZO);
});

for (const [nombre, cambios] of [
  ['campo trampa completo', () => ({ trampa: 'soy un robot' })],
  ['enviado a los 10 segundos', () => ({ abiertoEn: Date.now() - 10000 })],
  ['hora de apertura en el futuro', () => ({ abiertoEn: Date.now() + 600000 })],
  ['sin hora de apertura', () => ({ abiertoEn: undefined })],
  ['hora de apertura que no es un número', () => ({ abiertoEn: 'ayer' })],
]) {
  test(`se descarta sin aviso, con perfil normal y sin guardar: ${nombre}`, () => {
    const e = entorno();
    const r = aPlano(e.guardarRespuesta(envioValido(cambios())));
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.perfil.dimensiones.length, 5);
    assert.strictEqual(filasGuardadas(e).length, 0);
  });
}

test('el tiempo mínimo sale de Config', () => {
  const e = entorno({ config: { segundos_minimos: 5 } });
  e.guardarRespuesta(envioValido({ abiertoEn: Date.now() - 10000 }));
  assert.strictEqual(filasGuardadas(e).length, 1);
});

test('desde el 4.º envío de la misma cédula en el día se rechaza con el mensaje genérico', () => {
  const e = entorno();
  for (let i = 0; i < 3; i++) assert.strictEqual(e.guardarRespuesta(envioValido()).ok, true);
  assert.deepStrictEqual(aPlano(e.guardarRespuesta(envioValido())), RECHAZO);
  assert.deepStrictEqual(aPlano(e.guardarRespuesta(envioValido({ cedula: '12345672' }))), RECHAZO);
  assert.strictEqual(filasGuardadas(e).length, 3);
  assert.strictEqual(e.bloqueos.tomados, e.bloqueos.liberados);
});

test('la misma cédula con y sin cero inicial cuenta como una sola', () => {
  const e = entorno({ config: { max_envios_cedula_dia: 1 } });
  const sieteDigitos = ['6123450', '6123451', '6123452', '6123453', '6123454', '6123455', '6123456', '6123457', '6123458', '6123459'].find(c => n.cedulaValida_(c));
  assert.ok(sieteDigitos, 'tiene que haber un dígito verificador correcto');
  assert.strictEqual(e.guardarRespuesta(envioValido({ cedula: sieteDigitos })).ok, true);
  assert.deepStrictEqual(aPlano(e.guardarRespuesta(envioValido({ cedula: '0' + sieteDigitos }))), RECHAZO);
});

test('al llegar al tope por hora se rechaza y queda registrado', () => {
  const e = entorno({ config: { max_envios_hora: 2, max_envios_cedula_dia: 50 } });
  assert.strictEqual(e.guardarRespuesta(envioValido()).ok, true);
  assert.strictEqual(e.guardarRespuesta(envioValido()).ok, true);
  assert.deepStrictEqual(aPlano(e.guardarRespuesta(envioValido())), RECHAZO);
  assert.ok(e.registro.some(r => /tope: hora/.test(r)));
});

test('si el tope por hora está vacío en Config se usa el mínimo, nunca "sin límite"', () => {
  const e = entorno({ config: { max_envios_hora: '', max_envios_cedula_dia: 500 } });
  const reciente = new Date();
  const otras = Array.from({ length: n.TOPES_POR_DEFECTO_.max_envios_hora }, (_, i) => { const f = Array(5).fill(''); f[0] = reciente; f[4] = String(i).padStart(8, '0'); return f; });
  e.hojas.Respuestas.datos.push(...otras);
  assert.deepStrictEqual(aPlano(e.guardarRespuesta(envioValido())), RECHAZO);
});

test('sin bloqueo disponible no se escribe nada', () => {
  const e = entorno({ bloqueoDisponible: false });
  assert.deepStrictEqual(aPlano(e.guardarRespuesta(envioValido())), RECHAZO);
  assert.strictEqual(filasGuardadas(e).length, 0);
});

test('si la escritura falla: mensaje genérico, sin detalles, y el bloqueo se libera', () => {
  const e = entorno();
  e.hojas.Respuestas.fallar = true;
  assert.deepStrictEqual(aPlano(e.guardarRespuesta(envioValido())), RECHAZO);
  assert.strictEqual(e.bloqueos.liberados, 1);
  assert.ok(e.registro.some(r => /error interno \(Error\)/.test(r)));
  assert.ok(!e.registro.some(r => /datos privados/.test(r)), 'del error de Google no se registra el mensaje');
});

test('si Respuestas tiene otros encabezados no se escribe, para no correr columnas', () => {
  const e = entorno();
  e.hojas.Respuestas.datos[0][0] = 'otra_cosa';
  assert.deepStrictEqual(aPlano(e.guardarRespuesta(envioValido())), RECHAZO);
  assert.strictEqual(filasGuardadas(e).length, 0);
});

test('el registro de Ejecuciones no incluye datos personales', () => {
  const e = entorno();
  e.guardarRespuesta(envioValido({ cedula: 'mala' }));
  e.guardarRespuesta(envioValido({ trampa: 'x' }));
  const texto = e.registro.join(' ');
  assert.ok(!/Docente de Prueba|12345672|docente@ejemplo/i.test(texto));
});

// --- Piezas puras ---

test('quitarProteccion_: solo quita el apóstrofo de protección', () => {
  assert.strictEqual(n.quitarProteccion_("'=x"), '=x');
  assert.strictEqual(n.quitarProteccion_("'+x"), '+x');
  assert.strictEqual(n.quitarProteccion_("'Rocha"), "'Rocha");
  assert.strictEqual(n.quitarProteccion_('Rocha'), 'Rocha');
  assert.strictEqual(n.quitarProteccion_(7), 7);
});

test('centrosDeFilas_: encabezados distintos o filas sin código no entran', () => {
  assert.deepStrictEqual(n.centrosDeFilas_([['otra'], ['x']]), []);
  assert.deepStrictEqual(n.centrosDeFilas_(null), []);
  const fila = n.COLUMNAS_CENTROS_.map(() => '');
  assert.deepStrictEqual(n.centrosDeFilas_([n.COLUMNAS_CENTROS_, fila]), []);
});

test('clavesDeFilas_: ignora encabezados, claves raras y no toca el prototipo', () => {
  const r = n.clavesDeFilas_([['clave', 'texto'], ['intro_1', 'Hola'], ['__proto__', 'x'], ['', 'y'], ['Con Espacios', 'z']]);
  assert.deepStrictEqual(Object.keys(r), ['intro_1']);
  assert.strictEqual(({}).x, undefined);
  assert.deepStrictEqual(n.clavesDeFilas_(null), {});
});

test('topeDeConfig_: vacío, cero, negativo o texto usan el valor por defecto', () => {
  for (const valor of ['', '  ', 0, -3, 'muchos', null, undefined, 1.5, true, new Date(), 100001]) assert.strictEqual(n.topeDeConfig_({ max_envios_hora: valor }, 'max_envios_hora'), 20, String(valor));
  assert.strictEqual(n.topeDeConfig_({ segundos_minimos: 60000 }, 'segundos_minimos'), 60, 'alguien pensó en milisegundos');
  for (const clave of Object.keys(n.TOPES_MAXIMOS_)) assert.ok(n.TOPES_POR_DEFECTO_[clave] > 0, clave);
  for (const clave of ['max_mails_hora', 'max_mails_dia', 'max_mails_destino_dia']) assert.strictEqual(n.topeDeConfig_({}, clave), n.TOPES_POR_DEFECTO_[clave], clave);
  assert.strictEqual(n.topeDeConfig_({ max_envios_hora: 300 }, 'max_envios_hora'), 300);
  assert.strictEqual(n.topeDeConfig_({ max_envios_hora: '300' }, 'max_envios_hora'), 300);
});

test('diaEnUruguay_: el día cambia a la medianoche de Uruguay, no a la de UTC', () => {
  const antes = Date.UTC(2026, 10, 5, 2, 59); // 23:59 del 4 en Uruguay
  const despues = Date.UTC(2026, 10, 5, 3, 1); // 00:01 del 5 en Uruguay
  assert.strictEqual(n.diaEnUruguay_(despues) - n.diaEnUruguay_(antes), 1);
  assert.strictEqual(n.diaEnUruguay_(Date.UTC(2026, 10, 4, 12)), n.diaEnUruguay_(antes));
});

test('revisarLimites_: cuenta por día y por hora; una fecha ilegible cuenta como de ahora', () => {
  const ahora = Date.UTC(2026, 10, 5, 15);
  const topes = { max_envios_cedula_dia: 2, max_envios_hora: 3 };
  const hace = m => new Date(ahora - m * 60000);
  assert.deepStrictEqual(n.revisarLimites_([], '12345672', ahora, topes), { ok: true });
  assert.deepStrictEqual(n.revisarLimites_([[hace(200), '12345672'], [hace(300), '12345672']], '12345672', ahora, topes), { ok: false, motivo: 'cedula' });
  assert.deepStrictEqual(n.revisarLimites_([[hace(60 * 24), '12345672'], [hace(60 * 25), '12345672']], '12345672', ahora, topes), { ok: true });
  assert.deepStrictEqual(n.revisarLimites_([[hace(1), '1'], [hace(2), '2'], [hace(59), '3']], '12345672', ahora, topes), { ok: false, motivo: 'hora' });
  assert.deepStrictEqual(n.revisarLimites_([[hace(61), '1'], [hace(62), '2'], [hace(63), '3']], '12345672', ahora, topes), { ok: true });
  assert.deepStrictEqual(n.revisarLimites_([['no es fecha', '12345672'], ['', '12345672']], '12345672', ahora, topes), { ok: false, motivo: 'cedula' });
  assert.deepStrictEqual(n.revisarLimites_([['texto', '1'], ['texto', '2'], ['texto', '3']], '12345672', ahora, topes), { ok: false, motivo: 'hora' });
  assert.deepStrictEqual(n.revisarLimites_([['', ''], [null, null], [undefined, undefined]], '12345672', ahora, topes), { ok: true }, 'las filas vacías no cuentan');
  assert.deepStrictEqual(n.revisarLimites_([[hace(1), 1234567], [hace(2), '01234567']], '01234567', ahora, topes), { ok: false, motivo: 'cedula' });
});

test('filaDeRespuesta_ sigue el orden de las columnas y no deja huecos', () => {
  const datos = n.validarEnvio_(envioValido(), VALIDOS).datos;
  const fecha = new Date();
  const fila = n.filaDeRespuesta_(datos, fecha, 'no');
  assert.strictEqual(fila.length, n.ENCABEZADOS_RESPUESTAS_.length);
  assert.strictEqual(fila[0], fecha);
  assert.ok(fila.every(v => v !== undefined));
  assert.strictEqual(fila[columna('ctx_3')], 3);
  assert.strictEqual(fila[columna('d5_i3')], 3);
  assert.strictEqual(fila[columna('d4_nivel')], 'Consolidada');
});

test('resumenLimpieza_ avisa de los centros sin localidad fuera de Montevideo', () => {
  const r = { centros: [{ observacion: '', localidad: '', departamento: 'Rocha' }, { observacion: '', localidad: '', departamento: 'Montevideo' }], descartadas: [], duplicadas: 0 };
  assert.match(n.resumenLimpieza_(r), /sin localidad fuera de Montevideo .*: 1$/m);
});
