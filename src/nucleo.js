/**
 * nucleo.js — Lógica pura del autodiagnóstico.
 *
 * Reglas (ver CLAUDE.md):
 * - Sin servicios de Google (SpreadsheetApp, MailApp, etc.): todo se testea con Node.
 * - Sin require/import/export: en Apps Script todos los archivos comparten el espacio global.
 * - Toda función termina en guion bajo: así el navegador no puede llamarla (test/reglas.test.js).
 * - El bloque final exporta las funciones para los tests de Node; en Apps Script se ignora.
 */

const VERSION = '0.2.0';
const VERSION_INSTRUMENTO = '2026.1';

// ---------------------------------------------------------------------------
// 1. Instrumento: dimensiones, niveles y puntaje (docs/INSTRUMENTO.md)
// ---------------------------------------------------------------------------

const DIMENSIONES_ = [
  { id: 'd1', nombre: 'Autonomía técnica' },
  { id: 'd2', nombre: 'Uso pedagógico' },
  { id: 'd3', nombre: 'Apropiación pedagógica y condiciones para el uso' },
  { id: 'd4', nombre: 'Cultura tecnológica vinculada a micro:bit en el centro educativo' },
  { id: 'd5', nombre: 'Trabajo colaborativo e interdisciplinario' },
];

// Cantidad de opciones de cada pregunta de contexto (ctx_1, ctx_2, ctx_3).
const OPCIONES_CONTEXTO_ = [5, 4, 5];
const CANTIDAD_AFIRMACIONES_ = 15;

/** Nivel según la suma de 3 respuestas (3 a 15): f = a fortalecer, d = en desarrollo, c = consolidada. */
function nivelPorSuma_(suma) {
  if (suma <= 7) return 'f';
  if (suma <= 11) return 'd';
  return 'c';
}

/** Copia del arreglo con los huecos como undefined: every() se salta las posiciones vacías y así no pasarían. */
function sinHuecos_(arreglo) {
  return Array.from(arreglo);
}

function esRespuestaValida_(valor) {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= 5;
}

/**
 * Calcula el perfil a partir de las 15 respuestas (enteros 1..5, en el orden de docs/INSTRUMENTO.md).
 * Los niveles salen de la suma entera, nunca del promedio. Lanza error si las respuestas no son válidas.
 */
function calcularPerfil_(respuestas) {
  if (!Array.isArray(respuestas) || respuestas.length !== CANTIDAD_AFIRMACIONES_ || !sinHuecos_(respuestas).every(esRespuestaValida_)) {
    throw new Error('Respuestas inválidas');
  }
  const dimensiones = DIMENSIONES_.map((dim, i) => {
    const suma = respuestas[i * 3] + respuestas[i * 3 + 1] + respuestas[i * 3 + 2];
    return { id: dim.id, suma: suma, promedio: Math.round((suma / 3) * 100) / 100, nivel: nivelPorSuma_(suma) };
  });
  return { dimensiones: dimensiones, proximoPaso: proximoPaso_(dimensiones) };
}

/**
 * Ids de las dimensiones a trabajar: la de menor suma. Si empatan dos, las dos;
 * si empatan más de dos, solo la primera en orden. Vacío si todas son consolidadas.
 */
function proximoPaso_(dimensiones) {
  if (dimensiones.every(d => d.nivel === 'c')) return [];
  const minima = Math.min.apply(null, dimensiones.map(d => d.suma));
  const empatadas = dimensiones.filter(d => d.suma === minima).map(d => d.id);
  return empatadas.length <= 2 ? empatadas : [empatadas[0]];
}

/** Promedio con un decimal y coma (suma 11 → "3,7"). Usa enteros para evitar errores de redondeo. */
function formatearPromedio_(suma) {
  const decimas = Math.round((suma * 10) / 3);
  return Math.floor(decimas / 10) + ',' + (decimas % 10);
}

// ---------------------------------------------------------------------------
// 2. Cédula y correo
// ---------------------------------------------------------------------------

/** Deja solo los dígitos si el texto es una cédula bien escrita (admite puntos, guion y espacios); si no, null. */
function limpiarCedula_(texto) {
  if (typeof texto !== 'string' || texto.length > 20) return null;
  const sinSeparadores = texto.replace(/[.\-\s]/g, '');
  return /^\d{7,8}$/.test(sinSeparadores) ? sinSeparadores : null;
}

/** Cédula uruguaya de 7 u 8 dígitos (con dígito verificador), con o sin puntos y guion. */
function cedulaValida_(texto) {
  const digitos = limpiarCedula_(texto);
  if (digitos === null) return false;
  const completa = digitos.padStart(8, '0');
  const pesos = [2, 9, 8, 7, 6, 3, 4];
  let suma = 0;
  for (let i = 0; i < 7; i++) suma += Number(completa[i]) * pesos[i];
  return (10 - (suma % 10)) % 10 === Number(completa[7]);
}

const REGEX_CORREO_ = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

/** Formato de correo válido, máximo 254 caracteres (64 antes de la arroba). */
function correoValido_(texto) {
  if (typeof texto !== 'string' || texto.length > 254) return false;
  const arroba = texto.indexOf('@');
  if (arroba < 1 || arroba > 64) return false;
  return REGEX_CORREO_.test(texto);
}

const DOMINIOS_CONOCIDOS_ = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.ar', 'icloud.com', 'live.com',
  'ceibal.edu.uy', 'anep.edu.uy', 'adinet.com.uy', 'vera.com.uy',
];

/** Distancia de edición entre dos textos (cantidad mínima de cambios de una letra). */
function distanciaEdicion_(a, b) {
  let anterior = [];
  for (let j = 0; j <= b.length; j++) anterior.push(j);
  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      actual.push(Math.min(anterior[j] + 1, actual[j - 1] + 1, anterior[j - 1] + costo));
    }
    anterior = actual;
  }
  return anterior[b.length];
}

/** Si el dominio parece un error de tipeo de uno conocido ("gmial.com"), devuelve el correo corregido; si no, null. */
function sugerirCorreo_(correo) {
  if (!correoValido_(correo)) return null;
  const arroba = correo.lastIndexOf('@');
  const dominio = correo.slice(arroba + 1).toLowerCase();
  if (DOMINIOS_CONOCIDOS_.indexOf(dominio) !== -1) return null;
  let mejor = null;
  let mejorDistancia = Infinity;
  for (const conocido of DOMINIOS_CONOCIDOS_) {
    const maxima = conocido.length >= 8 ? 2 : 1;
    const d = distanciaEdicion_(dominio, conocido);
    if (d <= maxima && d < mejorDistancia) {
      mejor = conocido;
      mejorDistancia = d;
    }
  }
  return mejor === null ? null : correo.slice(0, arroba + 1) + mejor;
}

// ---------------------------------------------------------------------------
// 3. Protección contra fórmulas
// ---------------------------------------------------------------------------

/**
 * Si un texto podría interpretarse como fórmula en la planilla (empieza con =, +, - o @,
 * o con tabulación o salto de línea), le antepone un apóstrofo. Otros tipos de valor pasan sin cambios.
 */
function protegerFormula_(valor) {
  if (typeof valor !== 'string') return valor;
  return /^(?:[\t\r\n]|\s*[=+\-@])/.test(valor) ? "'" + valor : valor;
}

// ---------------------------------------------------------------------------
// 4. Normalización de texto
// ---------------------------------------------------------------------------

/** Minúsculas, sin tildes ni signos, con espacios simples. Base para comparar departamentos y localidades. */
function claveSimple_(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Abreviaturas que se expanden y palabras de "número" que se descartan.
const ABREVIATURAS_ = { esc: 'escuela', lic: 'liceo', jn: 'jardin', utu: 'escuela tecnica' };
const PALABRAS_NUMERO_ = new Set(['n', 'no', 'nro', 'nr', 'num', 'numero']);

/**
 * Normaliza un nombre de centro para buscar y comparar: minúsculas, sin tildes,
 * "Nº", "nro", "#" fuera, y abreviaturas expandidas ("esc" → "escuela", "UTU" → "escuela tecnica").
 */
function normalizarTexto_(texto) {
  const base = claveSimple_(String(texto === null || texto === undefined ? '' : texto).replace(/[º°ª]/g, ' '));
  if (!base) return '';
  const salida = [];
  for (const palabra of base.split(' ')) {
    if (PALABRAS_NUMERO_.has(palabra)) continue;
    salida.push(Object.prototype.hasOwnProperty.call(ABREVIATURAS_, palabra) ? ABREVIATURAS_[palabra] : palabra);
  }
  return salida.join(' ');
}

// ---------------------------------------------------------------------------
// 5. Limpieza del Universo → filas de Centros
// ---------------------------------------------------------------------------

const SUBSISTEMAS_ = ['DGEIP', 'DGES', 'DGETP', 'CFE'];
const DEPARTAMENTOS_ = [
  'Artigas', 'Canelones', 'Cerro Largo', 'Colonia', 'Durazno', 'Flores', 'Florida', 'Lavalleja', 'Maldonado',
  'Montevideo', 'Paysandú', 'Río Negro', 'Rivera', 'Rocha', 'Salto', 'San José', 'Soriano', 'Tacuarembó', 'Treinta y Tres',
];
const MESES_ = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const COLUMNAS_CENTROS_ = [
  'codigo', 'nombre', 'nombre_visible', 'subsistema', 'departamento', 'localidad', 'tipo', 'numero', 'nombre_normalizado', 'observacion',
];
const PALABRAS_MINUSCULA_ = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'en', 'a', 'e']);
const SIGLAS_ = new Set(['ifd', 'cerp', 'utu', 'cle', 'jn', 'cfe', 'dgeip', 'dges', 'dgetp', 'ceip', 'cetp', 'utec']);

/** "ESCUELA DEL SUR" → "Escuela del Sur". */
function aTitulo_(texto) {
  return texto
    .toLowerCase()
    .split(/\s+/)
    .filter(p => p !== '')
    .map((p, i) => {
      if (SIGLAS_.has(p)) return p.toUpperCase();
      if (i > 0 && PALABRAS_MINUSCULA_.has(p)) return p;
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(' ');
}

/** Si Excel convirtió la localidad en fecha ("2026-05-18 00:00:00" o un Date), la devuelve como "18 de Mayo". */
function repararLocalidad_(valor) {
  if (valor === null || valor === undefined) return { texto: '', corregida: false };
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return { texto: valor.getDate() + ' de ' + MESES_[valor.getMonth()], corregida: true };
  }
  const texto = String(valor).replace(/\s+/g, ' ').trim();
  const fecha = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(texto);
  if (fecha) {
    const mes = Number(fecha[2]);
    if (mes >= 1 && mes <= 12) return { texto: Number(fecha[3]) + ' de ' + MESES_[mes - 1], corregida: true };
  }
  return { texto: texto, corregida: false };
}

/** Nombre del departamento tal como se escribe en el catálogo, o null si no es uno de los 19 de Uruguay. */
function departamentoCanonico_(texto) {
  const clave = claveSimple_(texto);
  for (const d of DEPARTAMENTOS_) if (claveSimple_(d) === clave) return d;
  return null;
}

/** Quita del nombre el código al final ("... - 1101003", "... - S/N"). */
function limpiarNombreCentro_(nombre) {
  return String(nombre).replace(/\s+/g, ' ').replace(/\s*-\s*(?:\d{6,8}|s\/n)\s*$/i, '').trim();
}

/**
 * Tipo de centro: esc, jar, lic, utu, ifd, cerp, anexo u otro. Sale del nombre;
 * "Tipo dependencia" solo se usa si el nombre no alcanza, porque tiene inconsistencias.
 */
function detectarTipo_(nombre, tipoDependencia) {
  const palabras = new Set(claveSimple_(nombre).split(' '));
  const tiene = (...claves) => claves.some(c => palabras.has(c));
  if (tiene('anexo', 'satelite')) return 'anexo';
  if (tiene('ifd')) return 'ifd';
  if (tiene('cerp')) return 'cerp';
  if (tiene('utu', 'tecnica', 'agraria')) return 'utu';
  if (tiene('liceo')) return 'lic';
  if (tiene('jardin', 'jn')) return 'jar';
  if (tiene('escuela')) return 'esc';
  const tipo = claveSimple_(tipoDependencia);
  if (/\bsatelite\b|\banexo\b/.test(tipo)) return 'anexo';
  if (/^escuela publica/.test(tipo)) return 'esc';
  if (/^jardin publico/.test(tipo)) return 'jar';
  if (/^liceo publico/.test(tipo)) return 'lic';
  if (/^utu$/.test(tipo)) return 'utu';
  return 'otro';
}

const REGEX_MES_ = /^\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre)\b/i;

/** Primer número que aparece en el nombre ("Liceo Nº 7" → 7), salvo fechas como "25 de Mayo". */
function numeroDelNombre_(nombre) {
  const regex = /\d+/g;
  let m;
  while ((m = regex.exec(nombre)) !== null) {
    if (m[0].length > 4) continue;
    if (REGEX_MES_.test(nombre.slice(m.index + m[0].length))) continue;
    return Number(m[0]);
  }
  return null;
}

/** En escuelas y jardines públicos de DGEIP el código es 11 + departamento (2) + número (3). */
function numeroDelCodigo_(codigo, subsistema) {
  const texto = String(codigo);
  return subsistema === 'DGEIP' && /^11\d{5}$/.test(texto) ? Number(texto.slice(4)) : null;
}

/** Nombre para mostrar: escuelas y jardines con número de código se muestran como "Escuela Nº 35 · República de Islandia". */
function nombreVisible_(nombre, tipo, numeroCodigo) {
  let visible = aTitulo_(nombre).replace(/\bJardin\b/g, 'Jardín').replace(/\bNº\s*(?=\d)/g, 'Nº ');
  if (numeroCodigo !== null && (tipo === 'esc' || tipo === 'jar') && !/\d/.test(nombre)) {
    const prefijo = tipo === 'jar' ? 'Jardín' : 'Escuela';
    const resto = visible.replace(/^(?:Escuela|Jardín)\s+/, '');
    visible = prefijo + ' Nº ' + numeroCodigo + ' · ' + resto;
  }
  return visible;
}

/**
 * Convierte las filas de la hoja "Universo" (objetos con las columnas originales) en filas de Centros.
 * Devuelve { centros, descartadas: [{codigo, motivo}], duplicadas }.
 * Una fila por Código Ceibal; sin departamento se excluye; los departamentos fuera de Uruguay se
 * conservan marcados en `observacion` para revisión.
 */
function limpiarUniverso_(filas) {
  const centros = [];
  const descartadas = [];
  const vistos = new Set();
  let duplicadas = 0;
  for (const fila of filas || []) {
    if (fila === null || typeof fila !== 'object') {
      descartadas.push({ codigo: null, motivo: 'fila inválida' });
      continue;
    }
    const textoCodigo = String(fila['Código Ceibal']).trim();
    const codigo = /^\d{1,12}$/.test(textoCodigo) ? Number(textoCodigo) : NaN;
    if (!Number.isInteger(codigo) || codigo <= 0) {
      descartadas.push({ codigo: fila['Código Ceibal'], motivo: 'código inválido' });
      continue;
    }
    if (vistos.has(codigo)) {
      duplicadas++;
      continue;
    }

    const subsistema = String(fila['Rubro'] || '').trim().toUpperCase();
    if (SUBSISTEMAS_.indexOf(subsistema) === -1) {
      descartadas.push({ codigo: codigo, motivo: 'rubro desconocido' });
      continue;
    }
    const departamentoOriginal = String(fila['Departamento'] || '').replace(/\s+/g, ' ').trim();
    if (!departamentoOriginal) {
      descartadas.push({ codigo: codigo, motivo: 'sin departamento' });
      continue;
    }
    const nombre = limpiarNombreCentro_(fila['Nombre Dependencia'] || '');
    if (!nombre) {
      descartadas.push({ codigo: codigo, motivo: 'sin nombre' });
      continue;
    }

    vistos.add(codigo); // recién ahora: una fila inválida no debe ocultar a otra válida con el mismo código
    const observaciones = [];
    let departamento =departamentoCanonico_(departamentoOriginal);
    if (departamento === null) {
      departamento = aTitulo_(departamentoOriginal);
      observaciones.push('departamento fuera de Uruguay');
    }
    const localidad = repararLocalidad_(fila['Localidad']);
    if (localidad.corregida) observaciones.push('localidad corregida (venía como fecha)');

    const tipo = detectarTipo_(nombre, fila['Tipo dependencia']);
    // El número sale del código solo en escuelas y jardines; una inspección con código 11xxxxx no es "la escuela N".
    const numeroCodigo = tipo === 'esc' || tipo === 'jar' ? numeroDelCodigo_(codigo, subsistema) : null;
    const numero = numeroCodigo !== null ? numeroCodigo : numeroDelNombre_(nombre);
    const visible = nombreVisible_(nombre, tipo, numeroCodigo);

    centros.push({
      codigo: codigo,
      nombre: nombre,
      nombre_visible: visible,
      subsistema: subsistema,
      departamento: departamento,
      localidad: localidad.texto,
      tipo: tipo,
      numero: numero,
      nombre_normalizado: normalizarTexto_(visible),
      observacion: observaciones.join('; '),
    });
  }
  return { centros: centros, descartadas: descartadas, duplicadas: duplicadas };
}

/** Un centro como fila de la pestaña Centros, en el orden de COLUMNAS_CENTROS_ (vacío donde no hay dato). */
function centroAFila_(centro) {
  return COLUMNAS_CENTROS_.map(col => (centro[col] === null || centro[col] === undefined ? '' : protegerFormula_(centro[col])));
}

// ---------------------------------------------------------------------------
// 6. Validación completa de un envío (docs/SEGURIDAD.md, sección 3)
// ---------------------------------------------------------------------------

// Controles C0 y C1, invisibles (ancho cero, BOM) y marcas de dirección de texto (invierten lo que se ve).
const CARACTERES_DE_CONTROL_ = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯﻿]/;

/** Texto recortado y con espacios simples si es un string sin caracteres de control y de largo permitido; si no, null. */
function textoLimpio_(valor, minimo, maximo) {
  if (typeof valor !== 'string' || valor.length > maximo * 4) return null;
  if (CARACTERES_DE_CONTROL_.test(valor)) return null;
  const limpio = valor.replace(/\s+/g, ' ').trim();
  return limpio.length >= minimo && limpio.length <= maximo ? limpio : null;
}

/**
 * Valida un envío contra el catálogo recibido como parámetro (filas de Centros).
 * Rechaza el envío completo ante cualquier falla. Ignora los campos que no conoce.
 *
 * Devuelve { ok: true, datos } con los valores ya limpios (y el perfil recalculado), o { ok: false, campo }.
 * `campo` es solo para el registro interno y los tests: nunca se le muestra al docente.
 */
function validarEnvio_(envio, centros) {
  try {
    return validarEnvioInterno_(envio, centros);
  } catch (e) {
    return { ok: false, campo: 'envio' };
  }
}

function validarEnvioInterno_(envio, centros) {
  const falla = campo => ({ ok: false, campo: campo });
  if (envio === null || typeof envio !== 'object' || Array.isArray(envio)) return falla('envio');

  const nombre = textoLimpio_(envio.nombre, 3, 120);
  if (nombre === null || nombre.split(' ').length < 2) return falla('nombre');

  if (!cedulaValida_(envio.cedula)) return falla('cedula');
  // Una sola forma guardada (8 dígitos): "1234567" y "01234567" son la misma cédula para los límites por día.
  const cedula = limpiarCedula_(envio.cedula).padStart(8, '0');

  if (typeof envio.email !== 'string' || !correoValido_(envio.email.trim())) return falla('email');
  const email = envio.email.trim().toLowerCase();

  if (SUBSISTEMAS_.indexOf(envio.subsistema) === -1) return falla('subsistema');
  const subsistema = envio.subsistema;

  if (!Array.isArray(centros)) return falla('catalogo');
  const delSubsistema = centros.filter(c => c.subsistema === subsistema);
  if (typeof envio.departamento !== 'string') return falla('departamento');
  const delDepartamento = delSubsistema.filter(c => c.departamento === envio.departamento);
  if (delDepartamento.length === 0) return falla('departamento');
  const departamento = envio.departamento;

  let localidad = '';
  const localidadRecibida = envio.localidad === null || envio.localidad === undefined ? '' : envio.localidad;
  if (departamento === 'Montevideo') {
    if (localidadRecibida !== '') return falla('localidad');
  } else {
    if (typeof localidadRecibida !== 'string' || localidadRecibida === '') return falla('localidad');
    if (!delDepartamento.some(c => c.localidad === localidadRecibida)) return falla('localidad');
    localidad = localidadRecibida;
  }

  let centroCodigo = null;
  let centroTexto;
  let origenMacheo;
  if (envio.centroCodigo !== null && envio.centroCodigo !== undefined) {
    if (typeof envio.centroCodigo !== 'number' || !Number.isInteger(envio.centroCodigo)) return falla('centro');
    if (!delDepartamento.some(c => c.codigo === envio.centroCodigo)) return falla('centro');
    centroCodigo = envio.centroCodigo;
    const textoElegido = envio.centroTexto === null || envio.centroTexto === undefined || envio.centroTexto === ''
      ? ''
      : textoLimpio_(envio.centroTexto, 1, 150);
    if (textoElegido === null) return falla('centro');
    centroTexto = textoElegido;
    origenMacheo = 'elegido por docente';
  } else {
    centroTexto = textoLimpio_(envio.centroTexto, 3, 150);
    if (centroTexto === null) return falla('centro');
    origenMacheo = 'pendiente de revisión';
  }

  if (!Array.isArray(envio.ctx) || envio.ctx.length !== OPCIONES_CONTEXTO_.length) return falla('ctx');
  for (let i = 0; i < OPCIONES_CONTEXTO_.length; i++) {
    const v = envio.ctx[i];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > OPCIONES_CONTEXTO_[i]) return falla('ctx');
  }
  const ctx = envio.ctx.slice();

  if (!Array.isArray(envio.r) || envio.r.length !== CANTIDAD_AFIRMACIONES_ || !sinHuecos_(envio.r).every(esRespuestaValida_)) return falla('r');
  const r = envio.r.slice();

  return {
    ok: true,
    datos: {
      nombre: nombre,
      cedula: cedula,
      email: email,
      subsistema: subsistema,
      departamento: departamento,
      localidad: localidad,
      centroCodigo: centroCodigo,
      centroTexto: centroTexto,
      origenMacheo: origenMacheo,
      ctx: ctx,
      r: r,
      perfil: calcularPerfil_(r),
    },
  };
}

// ---------------------------------------------------------------------------
// 7. Macheo de texto libre contra el catálogo
// ---------------------------------------------------------------------------

// Palabras que describen el tipo de centro o conectan: no identifican a un centro en particular.
const PALABRAS_GENERICAS_ = new Set([
  'escuela', 'liceo', 'jardin', 'anexo', 'satelite', 'tecnica', 'agraria', 'ifd', 'cerp',
  'de', 'del', 'la', 'las', 'el', 'los', 'y', 'publica',
]);

function tokensDeNombre_(texto) {
  const normalizado = normalizarTexto_(texto);
  return normalizado === '' ? [] : normalizado.split(' ');
}

/** Palabras que identifican al centro (sin números ni palabras genéricas). */
function palabrasClave_(tokens) {
  return tokens.filter(t => !/^\d+$/.test(t) && !PALABRAS_GENERICAS_.has(t));
}

function palabraCoincide_(buscada, candidata) {
  if (buscada === candidata) return true;
  return buscada.length >= 5 && candidata.length >= 5 && distanciaEdicion_(buscada, candidata) <= 1;
}

/** Todas las palabras clave buscadas aparecen (con tolerancia a un error de tipeo) en el nombre del centro. */
function nombreCoincide_(buscadas, centro) {
  const delCentro = palabrasClave_(tokensDeNombre_(centro.nombre_normalizado));
  return buscadas.every(b => delCentro.some(c => palabraCoincide_(b, c)));
}

/** La localidad escrita coincide con la del catálogo, aunque esté incompleta ("Pinar" ↔ "El Pinar"). */
function localidadCoincide_(escrita, delCatalogo) {
  const a = claveSimple_(escrita);
  const b = claveSimple_(delCatalogo);
  if (a === '' || b === '') return false;
  if (a === b) return true;
  const palabrasA = a.split(' ');
  const palabrasB = b.split(' ');
  return palabrasA.every(p => palabrasB.indexOf(p) !== -1) || palabrasB.every(p => palabrasA.indexOf(p) !== -1);
}

/** Tipo de centro que nombra el texto (esc, jar, lic, utu, ifd, cerp), o null si no nombra ninguno. */
function tipoPedidoEnTexto_(tokens) {
  const tiene = clave => tokens.indexOf(clave) !== -1;
  if (tiene('tecnica') || tiene('agraria')) return 'utu';
  if (tiene('ifd')) return 'ifd';
  if (tiene('cerp')) return 'cerp';
  if (tiene('liceo')) return 'lic';
  if (tiene('jardin')) return 'jar';
  if (tiene('escuela')) return 'esc';
  return null;
}

/**
 * Intenta encontrar el centro que escribió un docente en texto libre.
 * Devuelve { codigo, estado: 'automatico' | 'revisar', confianza: 'alta' | 'media' | 'baja', motivo }.
 * Ante cualquier duda (varios centros posibles, número y nombre que no coinciden, nada parecido) va a revisión.
 * Solo busca dentro del subsistema y departamento indicados, y no elige anexos salvo que el texto los pida.
 */
function machearCentro_(texto, subsistema, departamento, localidad, centros) {
  const revisar = motivo => ({ codigo: null, estado: 'revisar', confianza: 'baja', motivo: motivo });
  if (typeof texto !== 'string' || texto.length > 300 || !Array.isArray(centros)) return revisar('texto no válido');

  const tokens = tokensDeNombre_(texto);
  if (tokens.length === 0) return revisar('texto vacío');
  const pideAnexo = tokens.indexOf('anexo') !== -1 || tokens.indexOf('satelite') !== -1;
  const primerNumero = tokens.find(t => /^\d{1,4}$/.test(t));
  const numero = primerNumero === undefined ? null : Number(primerNumero);
  const buscadas = palabrasClave_(tokens);
  if (numero === null && buscadas.length === 0) return revisar('sin número ni nombre');

  // Si el texto nombra un tipo de centro, se descartan los que son claramente de otro tipo
  // ("Jardín 35" no es la Escuela Nº 35). Los de tipo "otro" no se descartan: el nombre no alcanza para saberlo.
  const tipoPedido = tipoPedidoEnTexto_(tokens);
  const claveDepartamento = claveSimple_(departamento);
  const universo = centros.filter(c =>
    c.subsistema === subsistema && claveSimple_(c.departamento) === claveDepartamento && (c.tipo === 'anexo') === pideAnexo &&
    (pideAnexo || tipoPedido === null || c.tipo === 'otro' || c.tipo === tipoPedido));

  const porNumero = numero === null ? null : universo.filter(c => c.numero === numero);
  const porNombre = buscadas.length === 0 ? null : universo.filter(c => nombreCoincide_(buscadas, c));

  let candidatos;
  let confianza = 'media';
  if (porNumero !== null && porNombre !== null) {
    candidatos = porNumero.filter(c => porNombre.indexOf(c) !== -1);
    if (candidatos.length === 0) {
      return revisar(porNumero.length > 0 && porNombre.length > 0
        ? 'el número y el nombre indican centros distintos'
        : 'no hay un centro que coincida con el número y el nombre');
    }
    confianza = 'alta';
  } else {
    candidatos = porNumero !== null ? porNumero : porNombre;
  }
  if (candidatos.length === 0) return revisar('ningún centro coincide');

  if (candidatos.length > 1) {
    if (typeof localidad !== 'string' || claveSimple_(localidad) === '') return revisar('hay varios centros posibles y no se indicó localidad');
    candidatos = candidatos.filter(c => localidadCoincide_(localidad, c.localidad));
    if (candidatos.length !== 1) return revisar('la localidad no alcanza para elegir un único centro');
  }
  return { codigo: candidatos[0].codigo, estado: 'automatico', confianza: confianza, motivo: '' };
}

if (typeof module !== 'undefined') {
  module.exports = {
    VERSION, VERSION_INSTRUMENTO,
    DIMENSIONES_, OPCIONES_CONTEXTO_, COLUMNAS_CENTROS_,
    nivelPorSuma_, calcularPerfil_, proximoPaso_, formatearPromedio_,
    limpiarCedula_, cedulaValida_, correoValido_, sugerirCorreo_, distanciaEdicion_,
    protegerFormula_,
    claveSimple_, normalizarTexto_,
    aTitulo_, repararLocalidad_, detectarTipo_, limpiarUniverso_, centroAFila_,
    validarEnvio_,
    machearCentro_,
  };
}
