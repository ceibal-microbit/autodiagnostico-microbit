// Elige el proyecto de Apps Script al que apunta clasp: copia scriptId y rootDir de
// .clasp.<entorno>.json a .clasp.json. Uso: npm run entorno:prueba | npm run entorno:produccion
const fs = require('fs');
const path = require('path');

const entorno = process.argv[2];
if (!['prueba', 'produccion'].includes(entorno)) {
  console.error('Uso: node tools/usar-entorno.js prueba|produccion');
  process.exit(1);
}
const raiz = path.join(__dirname, '..');
const origen = path.join(raiz, `.clasp.${entorno}.json`);
if (!fs.existsSync(origen)) {
  console.error(`Falta ${path.basename(origen)}. Copiá .clasp.${entorno}.example.json y completá el scriptId (ver docs/DESPLIEGUE.md).`);
  process.exit(1);
}
const conf = JSON.parse(fs.readFileSync(origen, 'utf8'));
if (!conf.scriptId || conf.scriptId.startsWith('PEGAR_AQUI')) {
  console.error(`El scriptId de ${path.basename(origen)} no está completo.`);
  process.exit(1);
}
fs.writeFileSync(path.join(raiz, '.clasp.json'), JSON.stringify({ scriptId: conf.scriptId, rootDir: conf.rootDir || 'src' }, null, 2) + '\n');

if (entorno === 'produccion') {
  console.log('\n==============================================');
  console.log('  ATENCIÓN: clasp apunta a PRODUCCIÓN');
  console.log('  Lo que subas lo verán los docentes al publicar.');
  console.log('==============================================\n');
} else {
  console.log('clasp apunta al proyecto de PRUEBA.');
}
console.log(`scriptId: ${conf.scriptId}`);
