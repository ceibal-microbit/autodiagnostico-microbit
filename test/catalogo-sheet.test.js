// Prueba Catalogo.js con una planilla simulada en memoria.
//
// El simulador modela: pestañas, celdas, formatos de columna, límites de la grilla (1000 filas x 26 columnas
// y error al salirse), orden de las operaciones y el bloqueo. NO modela lo que Google hace por su cuenta:
// convertir "007" en número, "1/2" en fecha o "=x" en fórmula al escribir, ni que el menú pueda llamar
// funciones con guion bajo. Por eso no reemplaza la prueba real en la Sheet de prueba (docs/PLAN.md, fase 3).
//
// Se carga todo como en Apps Script: nucleo.js + textos.js + Catalogo.js comparten un mismo espacio global.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const universo = require('./fixtures/universo-sintetico.json');
const nucleo = require('../src/nucleo.js');
const { TEXTOS_INICIALES_ } = require('../src/textos.js');

const SRC = path.join(__dirname, '..', 'src');
const codigoFuente = ['nucleo.js', 'textos.js', 'Catalogo.js'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');

function letraAColumna(letra) {
  return [...letra].reduce((acc, c) => acc * 26 + c.charCodeAt(0) - 64, 0);
}

class RangoSimulado {
  constructor(hoja, fila, columna, filas, columnas) {
    if (fila < 1 || columna < 1 || filas < 1 || columnas < 1 || fila + filas - 1 > hoja.maxFilas || columna + columnas - 1 > hoja.maxColumnas) {
      throw new Error(`Rango fuera de la grilla de "${hoja.nombre}": fila ${fila}, columna ${columna}, ${filas}x${columnas} (grilla ${hoja.maxFilas}x${hoja.maxColumnas})`);
    }
    Object.assign(this, { hoja, fila, columna, filas, columnas });
  }
  getValues() {
    const salida = [];
    for (let i = 0; i < this.filas; i++) {
      const f = [];
      for (let j = 0; j < this.columnas; j++) f.push(this.hoja.valor(this.fila + i, this.columna + j));
      salida.push(f);
    }
    return salida;
  }
  setValues(valores) {
    assert.strictEqual(valores.length, this.filas, 'setValues: cantidad de filas distinta del rango');
    this.hoja.registrar('setValues');
    valores.forEach((f, i) => {
      assert.strictEqual(f.length, this.columnas, 'setValues: cantidad de columnas distinta del rango');
      f.forEach((v, j) => this.hoja.poner(this.fila + i, this.columna + j, v));
    });
    return this;
  }
  clearContent() {
    this.hoja.registrar('clearContent');
    for (let i = 0; i < this.filas; i++) for (let j = 0; j < this.columnas; j++) this.hoja.celdas.delete(this.hoja.clave(this.fila + i, this.columna + j));
    return this;
  }
  setNumberFormat(formato) {
    this.hoja.registrar('formato');
    for (let j = 0; j < this.columnas; j++) this.hoja.formatos[this.columna + j] = formato;
    return this;
  }
  setFontWeight() { this.hoja.registrar('negrita'); return this; }
}

class HojaSimulada {
  constructor(nombre) {
    this.nombre = nombre;
    this.celdas = new Map();
    this.formatos = {};
    this.registro = [];
    this.maxFilas = 1000;
    this.maxColumnas = 26;
    this.fallarEnSetValues = false;
  }
  registrar(operacion) {
    if (operacion === 'setValues' && this.fallarEnSetValues) throw new Error('Fallo simulado al escribir');
    this.registro.push(operacion);
  }
  clave(f, c) { return f + ',' + c; }
  valor(f, c) { return this.celdas.has(this.clave(f, c)) ? this.celdas.get(this.clave(f, c)) : ''; }
  poner(f, c, v) { this.celdas.set(this.clave(f, c), v); }
  getLastRow() {
    let max = 0;
    for (const [k, v] of this.celdas) if (v !== '') max = Math.max(max, Number(k.split(',')[0]));
    return max;
  }
  getLastColumn() {
    let max = 0;
    for (const [k, v] of this.celdas) if (v !== '') max = Math.max(max, Number(k.split(',')[1]));
    return max;
  }
  getMaxRows() { return this.maxFilas; }
  getMaxColumns() { return this.maxColumnas; }
  insertRowsAfter(posicion, cantidad) { this.registrar('insertRows'); this.maxFilas += cantidad; }
  insertColumnsAfter(posicion, cantidad) { this.registrar('insertColumns'); this.maxColumnas += cantidad; }
  getRange(a, b, nf = 1, nc = 1) {
    if (typeof a === 'string') {
      const m = /^([A-Z]+):([A-Z]+)$/.exec(a);
      assert.ok(m && m[1] === m[2], 'el simulador solo entiende columnas enteras como "E:E"');
      return new RangoSimulado(this, 1, letraAColumna(m[1]), this.maxFilas, 1);
    }
    return new RangoSimulado(this, a, b, nf, nc);
  }
  getDataRange() { return new RangoSimulado(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
  setFrozenRows() { this.registrar('congelar'); }
  filas() {
    const salida = [];
    const ultimaFila = this.getLastRow();
    const ultimaColumna = this.getLastColumn();
    for (let f = 1; f <= ultimaFila; f++) {
      const fila = [];
      for (let c = 1; c <= ultimaColumna; c++) fila.push(this.valor(f, c));
      salida.push(fila);
    }
    return salida;
  }
  cargar(filas) {
    filas.forEach((fila, i) => {
      while (this.maxFilas < i + 1) this.maxFilas += 1000;
      fila.forEach((v, j) => this.poner(i + 1, j + 1, v));
    });
  }
}

// Arma un entorno nuevo: planilla vacía, menú y avisos grabados, y las respuestas a las preguntas "¿Seguir?".
function entorno(respuestasConfirmar = ['YES', 'YES'], bloqueoDisponible = true) {
  const hojas = new Map();
  const avisos = [];
  const menus = [];
  const bloqueos = { tomados: 0, liberados: 0 };
  const respuestas = respuestasConfirmar.slice();
  const planilla = {
    getSheetByName: nombre => hojas.get(nombre) || null,
    insertSheet: nombre => { const h = new HojaSimulada(nombre); hojas.set(nombre, h); return h; },
  };
  const ui = {
    ButtonSet: { OK: 'OK', YES_NO: 'YES_NO' },
    Button: { YES: 'YES', NO: 'NO' },
    alert(titulo, mensaje, botones) {
      avisos.push({ titulo, mensaje, botones });
      return botones === 'YES_NO' ? (respuestas.length ? respuestas.shift() : 'NO') : 'OK';
    },
    createMenu(titulo) {
      const menu = { titulo, items: [] };
      menus.push(menu);
      const api = { addItem(texto, funcion) { menu.items.push([texto, funcion]); return api; }, addToUi() { return api; } };
      return api;
    },
  };
  const contexto = vm.createContext({
    SpreadsheetApp: { getActiveSpreadsheet: () => planilla, getUi: () => ui },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => { if (bloqueoDisponible) bloqueos.tomados++; return bloqueoDisponible; },
        releaseLock: () => { bloqueos.liberados++; },
      }),
    },
  });
  const funciones = vm.runInContext(codigoFuente + '\n;({ onOpen, prepararPlanilla_, actualizarCatalogo_ })', contexto);
  return { hojas, avisos, menus, bloqueos, ...funciones };
}

function valoresDeUniverso(cantidadExtra = 0) {
  const columnas = universo.columnas.concat(['Teléfono']);
  const filas = universo.filas.map(f => universo.columnas.map(c => (f[c] === null || f[c] === undefined ? '' : f[c])).concat(['099 000 000']));
  for (let i = 0; i < cantidadExtra; i++) filas.push([2000000 + i, `LICEO Nº ${i + 1} - PRUEBA`, 'DGES', 'Liceo Público', 'SALTO', 'Salto', '099 000 000']);
  return [columnas].concat(filas);
}

const NOMBRES = ['Universo original', 'Centros', 'Textos', 'Config', 'Respuestas'];
const operaciones = hoja => hoja.registro.length;

test('el menú tiene "Preparar planilla" y "Actualizar catálogo" y llama a funciones que terminan en guion bajo', () => {
  const e = entorno();
  e.onOpen();
  assert.strictEqual(e.menus.length, 1);
  assert.strictEqual(e.menus[0].titulo, 'Autodiagnóstico');
  assert.deepStrictEqual(e.menus[0].items, [['Preparar planilla', 'prepararPlanilla_'], ['Actualizar catálogo', 'actualizarCatalogo_']]);
});

test('el simulador falla si se escribe fuera de la grilla (como Apps Script)', () => {
  const hoja = new HojaSimulada('X');
  assert.throws(() => hoja.getRange(1, 1, 1, 27).setValues([Array(27).fill('a')]), /fuera de la grilla/);
  assert.throws(() => hoja.getRange(1001, 1));
});

test('Preparar planilla crea las cinco pestañas con encabezados (Respuestas necesita más de 26 columnas)', () => {
  const e = entorno();
  e.prepararPlanilla_();
  assert.deepStrictEqual([...e.hojas.keys()].sort(), NOMBRES.slice().sort());
  assert.strictEqual(e.hojas.get('Universo original').getLastRow(), 0);
  assert.strictEqual(e.hojas.get('Centros').filas()[0].join(','), 'codigo,nombre,nombre_visible,subsistema,departamento,localidad,tipo,numero,nombre_normalizado,observacion');
  assert.strictEqual(e.hojas.get('Respuestas').filas()[0].join(','), nucleo.ENCABEZADOS_RESPUESTAS_.join(','));
  assert.ok(e.hojas.get('Respuestas').maxColumnas >= 41);
  assert.deepStrictEqual(e.hojas.get('Textos').filas()[0], ['clave', 'texto']);
  assert.deepStrictEqual(e.hojas.get('Config').filas()[0], ['clave', 'valor', 'descripcion']);
  assert.strictEqual(e.avisos.length, 1);
  assert.strictEqual(e.avisos[0].titulo, 'Planilla preparada');
});

test('Preparar planilla carga todos los textos y la configuración iniciales', () => {
  const e = entorno();
  e.prepararPlanilla_();
  const filasTextos = e.hojas.get('Textos').filas().slice(1);
  assert.deepStrictEqual(Object.fromEntries(filasTextos), TEXTOS_INICIALES_);
  const config = e.hojas.get('Config').filas().slice(1);
  assert.strictEqual(config.length, 5);
  assert.deepStrictEqual(config.find(f => f[0] === 'segundos_minimos').slice(0, 2), ['segundos_minimos', 60]);
});

test('Preparar planilla pone "Texto sin formato" en las columnas de texto libre de Respuestas', () => {
  const e = entorno();
  e.prepararPlanilla_();
  const formatos = e.hojas.get('Respuestas').formatos;
  for (const c of nucleo.COLUMNAS_TEXTO_RESPUESTAS_) assert.strictEqual(formatos[nucleo.ENCABEZADOS_RESPUESTAS_.indexOf(c) + 1], '@', c);
  assert.strictEqual(formatos[nucleo.ENCABEZADOS_RESPUESTAS_.indexOf('d1_suma') + 1], undefined);
});

test('el formato de texto se aplica a la columna entera y antes de escribir los textos', () => {
  const e = entorno();
  e.prepararPlanilla_();
  const textos = e.hojas.get('Textos');
  assert.strictEqual(textos.formatos[2], '@');
  const ultimoFormato = textos.registro.lastIndexOf('formato');
  const ultimaEscritura = textos.registro.lastIndexOf('setValues');
  assert.ok(ultimoFormato < ultimaEscritura, 'el formato tiene que ir antes de escribir los textos');
});

test('ningún texto inicial empieza con =, +, - o @ (se leería como fórmula) ni es solo un número', () => {
  for (const [clave, texto] of Object.entries(TEXTOS_INICIALES_)) {
    assert.ok(!/^[=+\-@]/.test(texto.trim()), `${clave} empieza con un carácter de fórmula`);
    assert.ok(!/^[\d.,\s]+$/.test(texto), `${clave} es solo un número`);
  }
});

test('Preparar planilla dos veces no cambia nada y no pisa lo que editó el equipo', () => {
  const e = entorno();
  e.prepararPlanilla_();
  const textos = e.hojas.get('Textos');
  const config = e.hojas.get('Config');
  const fila = textos.filas().findIndex(f => f[0] === 'cierre_1') + 1;
  textos.poner(fila, 2, 'Texto editado por el equipo');
  const filaConfig = config.filas().findIndex(f => f[0] === 'max_envios_hora') + 1;
  config.poner(filaConfig, 2, 25);
  const antes = [...e.hojas.values()].map(h => JSON.stringify(h.filas()));

  e.prepararPlanilla_();

  assert.deepStrictEqual([...e.hojas.values()].map(h => JSON.stringify(h.filas())), antes);
  assert.strictEqual(textos.valor(fila, 2), 'Texto editado por el equipo');
  assert.strictEqual(config.valor(filaConfig, 2), 25);
  assert.match(e.avisos[1].mensaje, /0 textos agregados \(los demás ya estaban y no se tocaron\)/);
});

test('Preparar planilla agrega solo la clave que falta', () => {
  const e = entorno();
  e.prepararPlanilla_();
  const textos = e.hojas.get('Textos');
  const fila = textos.filas().findIndex(f => f[0] === 'd2_c_rec') + 1;
  textos.celdas.delete(textos.clave(fila, 1));
  textos.celdas.delete(textos.clave(fila, 2));
  e.prepararPlanilla_();
  assert.strictEqual(textos.filas().filter(f => f[0] === 'd2_c_rec').length, 1);
  assert.match(e.avisos[1].mensaje, /1 texto agregado /);
});

test('Preparar planilla no toca pestañas con encabezados distintos', () => {
  const e = entorno();
  e.prepararPlanilla_();
  const respuestas = e.hojas.get('Respuestas');
  respuestas.poner(1, 1, 'otra_cosa');
  const centros = e.hojas.get('Centros');
  centros.cargar([['x', 'y'], ['dato 1', 'dato 2']]);
  const antes = JSON.stringify([respuestas.filas(), centros.filas()]);
  e.prepararPlanilla_();
  assert.strictEqual(JSON.stringify([respuestas.filas(), centros.filas()]), antes);
  assert.match(e.avisos[1].mensaje, /Respuestas: los encabezados no son los esperados/);
  assert.match(e.avisos[1].mensaje, /Centros: ya tenía otros encabezados/);
});

test('Actualizar catálogo reescribe Centros con el Universo limpio y no toca ninguna otra pestaña', () => {
  const e = entorno();
  e.prepararPlanilla_();
  e.hojas.get('Universo original').cargar(valoresDeUniverso());
  const respuestas = e.hojas.get('Respuestas');
  respuestas.cargar([nucleo.ENCABEZADOS_RESPUESTAS_, ['dato real', 'no tocar']]);
  const otras = ['Respuestas', 'Textos', 'Config', 'Universo original'];
  const antes = otras.map(n => operaciones(e.hojas.get(n)));
  const formatosAntes = otras.map(n => JSON.stringify(e.hojas.get(n).formatos));

  e.actualizarCatalogo_();

  const esperado = nucleo.limpiarUniverso_(universo.filas).centros;
  const filas = e.hojas.get('Centros').filas();
  assert.strictEqual(filas.length, esperado.length + 1);
  assert.deepStrictEqual(filas[0], nucleo.COLUMNAS_CENTROS_);
  assert.deepStrictEqual(filas[1], nucleo.centroAFila_(esperado[0]).map(v => (v === null ? '' : v)));
  assert.ok(!filas.some(f => f.includes('Teléfono') || f.includes('099 000 000')));
  assert.deepStrictEqual(otras.map(n => operaciones(e.hojas.get(n))), antes);
  assert.deepStrictEqual(otras.map(n => JSON.stringify(e.hojas.get(n).formatos)), formatosAntes);
  assert.strictEqual(respuestas.valor(2, 1), 'dato real');
  const ultimo = e.avisos[e.avisos.length - 1];
  assert.strictEqual(ultimo.titulo, 'Catálogo actualizado');
  assert.match(ultimo.mensaje, /Centros en el catálogo: 63(?!\d)/);
});

test('Actualizar catálogo da formato de texto a las columnas de texto de Centros antes de escribir', () => {
  const e = entorno();
  e.prepararPlanilla_();
  e.hojas.get('Universo original').cargar(valoresDeUniverso());
  const centros = e.hojas.get('Centros');
  const desde = centros.registro.length;
  e.actualizarCatalogo_();
  const nuevas = centros.registro.slice(desde);
  assert.strictEqual(nuevas.filter(o => o === 'formato').length, nucleo.COLUMNAS_TEXTO_CENTROS_.length);
  assert.ok(nuevas.lastIndexOf('formato') < nuevas.indexOf('setValues'));
  assert.strictEqual(centros.formatos[nucleo.COLUMNAS_CENTROS_.indexOf('localidad') + 1], '@');
  assert.strictEqual(centros.formatos[nucleo.COLUMNAS_CENTROS_.indexOf('codigo') + 1], undefined);
});

test('Actualizar catálogo agranda la grilla si hay más de 1000 centros', () => {
  const e = entorno();
  e.prepararPlanilla_();
  e.hojas.get('Universo original').cargar(valoresDeUniverso(1500));
  e.actualizarCatalogo_();
  const centros = e.hojas.get('Centros');
  assert.strictEqual(centros.filas().length, 63 + 1500 + 1);
  assert.ok(centros.maxFilas >= centros.filas().length);
});

test('Actualizar catálogo usa el bloqueo y lo libera', () => {
  const e = entorno();
  e.prepararPlanilla_();
  e.hojas.get('Universo original').cargar(valoresDeUniverso());
  e.actualizarCatalogo_();
  assert.deepStrictEqual(e.bloqueos, { tomados: 1, liberados: 1 });
});

test('Actualizar catálogo con otra operación en curso no escribe nada', () => {
  const e = entorno(['YES', 'YES'], false);
  e.prepararPlanilla_();
  e.hojas.get('Universo original').cargar(valoresDeUniverso());
  const centros = e.hojas.get('Centros');
  const antes = JSON.stringify(centros.filas());
  const ops = operaciones(centros);
  e.actualizarCatalogo_();
  assert.strictEqual(JSON.stringify(centros.filas()), antes);
  assert.strictEqual(operaciones(centros), ops);
  assert.match(e.avisos[e.avisos.length - 1].mensaje, /Hay otra operación en curso/);
});

test('si la escritura falla, Centros conserva el catálogo anterior y el bloqueo se libera', () => {
  const e = entorno();
  e.prepararPlanilla_();
  e.hojas.get('Universo original').cargar(valoresDeUniverso());
  e.actualizarCatalogo_();
  const centros = e.hojas.get('Centros');
  const antes = JSON.stringify(centros.filas());
  e.hojas.get('Universo original').cargar(valoresDeUniverso(5));
  centros.fallarEnSetValues = true;
  assert.throws(() => e.actualizarCatalogo_(), /Fallo simulado/);
  assert.strictEqual(JSON.stringify(centros.filas()), antes);
  assert.strictEqual(e.bloqueos.liberados, e.bloqueos.tomados);
});

test('Actualizar catálogo pide confirmación mostrando cuántos centros hay hoy y cuántos quedarían', () => {
  const e = entorno();
  e.prepararPlanilla_();
  e.hojas.get('Universo original').cargar(valoresDeUniverso());
  e.actualizarCatalogo_();
  const pregunta = e.avisos.find(a => a.botones === 'YES_NO');
  assert.match(pregunta.mensaje, /tiene 0 centros y quedaría con 63/);
  e.actualizarCatalogo_();
  const segunda = e.avisos.filter(a => a.botones === 'YES_NO')[1];
  assert.match(segunda.mensaje, /tiene 63 centros y quedaría con 63/);
});

test('si se dice que no, no cambia nada', () => {
  const e = entorno(['NO']);
  e.prepararPlanilla_();
  e.hojas.get('Universo original').cargar(valoresDeUniverso());
  const centros = e.hojas.get('Centros');
  centros.cargar([['codigo'], ['dato viejo']]);
  const antes = JSON.stringify(centros.filas());
  const ops = operaciones(centros);
  e.actualizarCatalogo_();
  assert.strictEqual(JSON.stringify(centros.filas()), antes);
  assert.strictEqual(operaciones(centros), ops);
  assert.strictEqual(e.avisos.filter(a => a.botones === 'YES_NO').length, 1);
});

test('si el catálogo se achica más de 20%, hay una segunda confirmación y con "no" no cambia nada', () => {
  const e = entorno(['YES', 'YES', 'NO']);
  e.prepararPlanilla_();
  e.hojas.get('Universo original').cargar(valoresDeUniverso());
  e.actualizarCatalogo_();
  const centros = e.hojas.get('Centros');
  const antes = JSON.stringify(centros.filas());
  e.hojas.get('Universo original').celdas = new Map();
  e.hojas.get('Universo original').cargar(valoresDeUniverso().slice(0, 13)); // 12 filas de 63
  e.actualizarCatalogo_();
  const preguntas = e.avisos.filter(a => a.botones === 'YES_NO');
  assert.strictEqual(preguntas.length, 3);
  assert.match(preguntas[2].titulo, /Atención/);
  assert.match(preguntas[2].mensaje, /de 63 a \d+ centros \(baja de más del 20%\)/);
  assert.strictEqual(JSON.stringify(centros.filas()), antes);
});

test('con la segunda confirmación en "sí", el catálogo chico se aplica y sobran filas viejas limpias', () => {
  const e = entorno(['YES', 'YES', 'YES', 'YES']);
  e.prepararPlanilla_();
  e.hojas.get('Universo original').cargar(valoresDeUniverso());
  e.actualizarCatalogo_();
  const centros = e.hojas.get('Centros');
  e.hojas.get('Universo original').celdas = new Map();
  e.hojas.get('Universo original').cargar(valoresDeUniverso().slice(0, 13));
  e.actualizarCatalogo_();
  const filas = centros.filas();
  assert.ok(filas.length < 20);
  assert.strictEqual(centros.getLastRow(), filas.length);
});

test('Actualizar catálogo con el Universo vacío no borra Centros', () => {
  const e = entorno();
  e.prepararPlanilla_();
  const centros = e.hojas.get('Centros');
  centros.cargar([['codigo'], ['dato viejo']]);
  const antes = JSON.stringify(centros.filas());
  e.actualizarCatalogo_();
  assert.strictEqual(JSON.stringify(centros.filas()), antes);
  assert.match(e.avisos[e.avisos.length - 1].mensaje, /está vacía o no existe.*Centros quedó como estaba/);
});

test('Actualizar catálogo sin la pestaña Universo avisa y no crea nada', () => {
  const e = entorno();
  e.actualizarCatalogo_();
  assert.strictEqual(e.hojas.size, 0);
  assert.match(e.avisos[0].mensaje, /está vacía o no existe/);
});

test('Actualizar catálogo con columnas que faltan avisa cuáles y no borra Centros', () => {
  const e = entorno();
  e.prepararPlanilla_();
  e.hojas.get('Universo original').cargar([['Código Ceibal', 'Rubro'], [1, 'DGES']]);
  const centros = e.hojas.get('Centros');
  const antes = JSON.stringify(centros.filas());
  e.actualizarCatalogo_();
  assert.strictEqual(JSON.stringify(centros.filas()), antes);
  assert.match(e.avisos[e.avisos.length - 1].mensaje, /no se encontraron las columnas: Nombre Dependencia, Tipo dependencia, Departamento, Localidad/);
});

test('Actualizar catálogo si no queda ningún centro válido no borra Centros', () => {
  const e = entorno();
  e.prepararPlanilla_();
  e.hojas.get('Universo original').cargar([universo.columnas, [1, 'X', 'DGES', 'Liceo', '', '']]);
  const centros = e.hojas.get('Centros');
  const antes = JSON.stringify(centros.filas());
  e.actualizarCatalogo_();
  assert.strictEqual(JSON.stringify(centros.filas()), antes);
  assert.match(e.avisos[e.avisos.length - 1].mensaje, /no quedó ningún centro, así que no se borró nada/);
});

test('Actualizar catálogo dos veces da el mismo resultado', () => {
  const e = entorno(['YES', 'YES', 'YES']);
  e.prepararPlanilla_();
  e.hojas.get('Universo original').cargar(valoresDeUniverso());
  e.actualizarCatalogo_();
  const primera = JSON.stringify(e.hojas.get('Centros').filas());
  e.actualizarCatalogo_();
  assert.strictEqual(JSON.stringify(e.hojas.get('Centros').filas()), primera);
});
