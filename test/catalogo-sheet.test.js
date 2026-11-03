// Prueba Catalogo.js con una planilla simulada en memoria (no reemplaza la prueba real en la Sheet de prueba).
// Se carga todo como en Apps Script: nucleo.js + textos.js + Catalogo.js comparten un mismo espacio global.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const universo = require('./fixtures/universo-sintetico.json');

const SRC = path.join(__dirname, '..', 'src');
const codigoFuente = ['nucleo.js', 'textos.js', 'Catalogo.js'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');

class RangoSimulado {
  constructor(hoja, fila, columna, filas, columnas) {
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
    valores.forEach((f, i) => {
      assert.strictEqual(f.length, this.columnas, 'setValues: cantidad de columnas distinta del rango');
      f.forEach((v, j) => this.hoja.poner(this.fila + i, this.columna + j, v));
    });
    this.hoja.escrituras++;
    return this;
  }
  setNumberFormat(formato) {
    for (let j = 0; j < this.columnas; j++) this.hoja.formatos[this.columna + j] = formato;
    return this;
  }
  setFontWeight() { return this; }
}

class HojaSimulada {
  constructor(nombre) {
    this.nombre = nombre;
    this.celdas = new Map();
    this.formatos = {};
    this.escrituras = 0;
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
  getMaxRows() { return Math.max(1000, this.getLastRow()); }
  getRange(f, c, nf = 1, nc = 1) { return new RangoSimulado(this, f, c, nf, nc); }
  getDataRange() { return new RangoSimulado(this, 1, 1, this.getLastRow(), this.getLastColumn()); }
  clearContents() { this.celdas = new Map(); this.escrituras++; }
  setFrozenRows() {}
  filas() {
    const salida = [];
    for (let f = 1; f <= this.getLastRow(); f++) {
      const fila = [];
      for (let c = 1; c <= this.getLastColumn(); c++) fila.push(this.valor(f, c));
      salida.push(fila);
    }
    return salida;
  }
  cargar(filas) {
    filas.forEach((fila, i) => fila.forEach((v, j) => this.poner(i + 1, j + 1, v)));
  }
}

// Arma un entorno nuevo: planilla vacía, menú y avisos grabados, y la respuesta que se da a "¿Seguir?".
function entorno(respuestaConfirmar = 'YES') {
  const hojas = new Map();
  const avisos = [];
  const menus = [];
  const planilla = {
    getSheetByName: nombre => hojas.get(nombre) || null,
    insertSheet: nombre => { const h = new HojaSimulada(nombre); hojas.set(nombre, h); return h; },
  };
  const ui = {
    ButtonSet: { OK: 'OK', YES_NO: 'YES_NO' },
    Button: { YES: 'YES', NO: 'NO' },
    alert(titulo, mensaje, botones) { avisos.push({ titulo, mensaje, botones }); return botones === 'YES_NO' ? respuestaConfirmar : 'OK'; },
    createMenu(titulo) {
      const menu = { titulo, items: [] };
      menus.push(menu);
      const api = { addItem(texto, funcion) { menu.items.push([texto, funcion]); return api; }, addToUi() { return api; } };
      return api;
    },
  };
  const contexto = vm.createContext({
    SpreadsheetApp: { getActiveSpreadsheet: () => planilla, getUi: () => ui },
  });
  const funciones = vm.runInContext(codigoFuente + '\n;({ onOpen, prepararPlanilla_, actualizarCatalogo_ })', contexto);
  return { hojas, avisos, menus, ...funciones };
}

function valoresDeUniverso() {
  const columnas = universo.columnas.concat(['Teléfono']);
  return [columnas].concat(universo.filas.map(f => universo.columnas.map(c => (f[c] === null || f[c] === undefined ? '' : f[c])).concat(['099 000 000'])));
}

const NOMBRES = ['Universo original', 'Centros', 'Textos', 'Config', 'Respuestas'];

test('el menú tiene "Preparar planilla" y "Actualizar catálogo" y llama a funciones que terminan en guion bajo', () => {
  const e = entorno();
  e.onOpen();
  assert.strictEqual(e.menus.length, 1);
  assert.strictEqual(e.menus[0].titulo, 'Autodiagnóstico');
  assert.deepStrictEqual(e.menus[0].items, [['Preparar planilla', 'prepararPlanilla_'], ['Actualizar catálogo', 'actualizarCatalogo_']]);
});

test('Preparar planilla crea las cinco pestañas con encabezados', () => {
  const e = entorno();
  e.prepararPlanilla_();
  assert.deepStrictEqual([...e.hojas.keys()].sort(), NOMBRES.slice().sort());
  assert.strictEqual(e.hojas.get('Universo original').getLastRow(), 0);
  assert.deepStrictEqual(e.hojas.get('Centros').filas()[0], Array.from(e.hojas.get('Centros').filas()[0]));
  assert.deepStrictEqual(e.hojas.get('Centros').filas()[0].join(','), 'codigo,nombre,nombre_visible,subsistema,departamento,localidad,tipo,numero,nombre_normalizado,observacion');
  assert.deepStrictEqual(e.hojas.get('Respuestas').filas()[0].join(','), require('../src/nucleo.js').ENCABEZADOS_RESPUESTAS_.join(','));
  assert.deepStrictEqual(e.hojas.get('Textos').filas()[0], ['clave', 'texto']);
  assert.deepStrictEqual(e.hojas.get('Config').filas()[0], ['clave', 'valor', 'descripcion']);
  assert.strictEqual(e.avisos.length, 1);
  assert.strictEqual(e.avisos[0].titulo, 'Planilla preparada');
});

test('Preparar planilla carga todos los textos y la configuración iniciales', () => {
  const e = entorno();
  e.prepararPlanilla_();
  const { TEXTOS_INICIALES_ } = require('../src/textos.js');
  const filasTextos = e.hojas.get('Textos').filas().slice(1);
  assert.deepStrictEqual(Object.fromEntries(filasTextos), TEXTOS_INICIALES_);
  const config = e.hojas.get('Config').filas().slice(1);
  assert.strictEqual(config.length, 5);
  assert.deepStrictEqual(config.find(f => f[0] === 'segundos_minimos').slice(0, 2), ['segundos_minimos', 60]);
});

test('Preparar planilla pone "Texto sin formato" en las columnas de texto libre de Respuestas', () => {
  const e = entorno();
  e.prepararPlanilla_();
  const encabezados = require('../src/nucleo.js').ENCABEZADOS_RESPUESTAS_;
  const formatos = e.hojas.get('Respuestas').formatos;
  for (const c of ['nombre', 'cedula', 'email', 'centro_texto']) assert.strictEqual(formatos[encabezados.indexOf(c) + 1], '@', c);
  assert.strictEqual(formatos[encabezados.indexOf('d1_suma') + 1], undefined);
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
  textos.poner(fila, 1, '');
  textos.poner(fila, 2, '');
  e.prepararPlanilla_();
  assert.strictEqual(textos.filas().filter(f => f[0] === 'd2_c_rec').length, 1);
  assert.match(e.avisos[1].mensaje, /1 textos agregados/);
});

test('Preparar planilla no toca pestañas que ya tienen contenido ni encabezados distintos', () => {
  const e = entorno();
  e.insertSheetPara = null;
  e.prepararPlanilla_(); // crea todo
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

test('Actualizar catálogo reescribe Centros con el Universo limpio y no toca nada más', () => {
  const e = entorno();
  e.prepararPlanilla_();
  e.hojas.get('Universo original').cargar(valoresDeUniverso());
  const respuestas = e.hojas.get('Respuestas');
  respuestas.cargar([require('../src/nucleo.js').ENCABEZADOS_RESPUESTAS_, ['dato real', 'no tocar']]);
  const antes = { respuestas: respuestas.escrituras, textos: e.hojas.get('Textos').escrituras, config: e.hojas.get('Config').escrituras, universo: e.hojas.get('Universo original').escrituras };

  e.actualizarCatalogo_();

  const n = require('../src/nucleo.js');
  const esperado = n.limpiarUniverso_(universo.filas).centros;
  const filas = e.hojas.get('Centros').filas();
  assert.strictEqual(filas.length, esperado.length + 1);
  assert.deepStrictEqual(filas[0], n.COLUMNAS_CENTROS_);
  assert.deepStrictEqual(filas[1], n.centroAFila_(esperado[0]).map(v => (v === null ? '' : v)));
  assert.ok(!filas.some(f => f.includes('Teléfono') || f.includes('099 000 000')));
  assert.deepStrictEqual(
    { respuestas: respuestas.escrituras, textos: e.hojas.get('Textos').escrituras, config: e.hojas.get('Config').escrituras, universo: e.hojas.get('Universo original').escrituras },
    antes);
  assert.strictEqual(respuestas.valor(2, 1), 'dato real');
  const ultimo = e.avisos[e.avisos.length - 1];
  assert.strictEqual(ultimo.titulo, 'Catálogo actualizado');
  assert.match(ultimo.mensaje, /Centros en el catálogo: 63/);
});

test('Actualizar catálogo pide confirmación y, si se dice que no, no cambia nada', () => {
  const e = entorno('NO');
  e.prepararPlanilla_();
  e.hojas.get('Universo original').cargar(valoresDeUniverso());
  const centros = e.hojas.get('Centros');
  centros.cargar([['codigo'], ['dato viejo']]);
  const antes = JSON.stringify(centros.filas());
  e.actualizarCatalogo_();
  assert.strictEqual(JSON.stringify(centros.filas()), antes);
  assert.strictEqual(e.avisos.filter(a => a.botones === 'YES_NO').length, 1);
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
  centros.cargar([['codigo'], ['dato viejo']]);
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
  centros.cargar([['codigo'], ['dato viejo']]);
  const antes = JSON.stringify(centros.filas());
  e.actualizarCatalogo_();
  assert.strictEqual(JSON.stringify(centros.filas()), antes);
  assert.match(e.avisos[e.avisos.length - 1].mensaje, /no quedó ningún centro, así que no se borró nada/);
});

test('Actualizar catálogo dos veces da el mismo resultado', () => {
  const e = entorno();
  e.prepararPlanilla_();
  e.hojas.get('Universo original').cargar(valoresDeUniverso());
  e.actualizarCatalogo_();
  const primera = JSON.stringify(e.hojas.get('Centros').filas());
  e.actualizarCatalogo_();
  assert.strictEqual(JSON.stringify(e.hojas.get('Centros').filas()), primera);
});
