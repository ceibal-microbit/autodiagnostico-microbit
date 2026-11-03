// Elige el proyecto de Apps Script al que apunta clasp: copia scriptId y rootDir de
// .clasp.<entorno>.json a .clasp.json. Uso: npm run entorno:prueba | npm run entorno:produccion
const fs = require('fs');
const path = require('path');

/**
 * Lee y controla .clasp.<entorno>.json. Si algo está mal, lanza un Error con un mensaje en español
 * simple (no el error técnico de Node). Devuelve { scriptId, rootDir }.
 */
function leerConfiguracion(origen) {
  const nombre = path.basename(origen);
  const entorno = nombre.replace(/^\.clasp\./, '').replace(/\.json$/, '');
  if (!fs.existsSync(origen)) {
    throw new Error(`Falta ${nombre}. Copiá .clasp.${entorno}.example.json y completá el scriptId (ver docs/DESPLIEGUE.md).`);
  }
  let conf;
  try {
    conf = JSON.parse(fs.readFileSync(origen, 'utf8'));
  } catch (e) {
    throw new Error(`El archivo ${nombre} no tiene un formato JSON válido (${e.message}). Revisá que no falten ni sobren comas, comillas o llaves; podés volver a copiar .clasp.${entorno}.example.json y completar solo el scriptId.`);
  }
  if (conf === null || typeof conf !== 'object' || Array.isArray(conf)) {
    throw new Error(`El archivo ${nombre} tiene que ser un objeto JSON con "scriptId" y "rootDir" (mirá .clasp.${entorno}.example.json).`);
  }
  if (typeof conf.scriptId !== 'string' || !conf.scriptId || conf.scriptId.startsWith('PEGAR_AQUI')) {
    throw new Error(`El scriptId de ${nombre} no está completo.`);
  }
  return { scriptId: conf.scriptId, rootDir: typeof conf.rootDir === 'string' && conf.rootDir ? conf.rootDir : 'src' };
}

function principal() {
  const entorno = process.argv[2];
  if (!['prueba', 'produccion'].includes(entorno)) {
    console.error('Uso: node tools/usar-entorno.js prueba|produccion');
    process.exit(1);
  }
  const raiz = path.join(__dirname, '..');
  let conf;
  try {
    conf = leerConfiguracion(path.join(raiz, `.clasp.${entorno}.json`));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  fs.writeFileSync(path.join(raiz, '.clasp.json'), JSON.stringify(conf, null, 2) + '\n');

  if (entorno === 'produccion') {
    console.log('\n==============================================');
    console.log('  ATENCIÓN: clasp apunta a PRODUCCIÓN');
    console.log('  Lo que subas lo verán los docentes al publicar.');
    console.log('==============================================\n');
  } else {
    console.log('clasp apunta al proyecto de PRUEBA.');
  }
  console.log(`scriptId: ${conf.scriptId}`);
}

if (require.main === module) principal();

module.exports = { leerConfiguracion };
