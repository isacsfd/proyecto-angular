/**
 * Reorganiza los bundles del build de producción de Angular (application builder):
 * - Mueve los *.js de la raíz a /js y los *.css a /css.
 * - Reescribe SOLO las referencias de index.html (resueltas con
 *   <base href="/"/>): las rutas relativas de los bundles ("./chunk-…js")
 *   resuelven automáticamente dentro de /js, sin tocar los bundles.
 * - Nunca escribe fuera de dist/Frontend-Angular/browser (carpeta publicada).
 *
 * Motivación: en Netlify los splat de los redirects solo son válidos al
 * final del segmento ("/jobs/*"), no como "/*.js". Con los bundles en
 * carpetas se pueden aplicar reglas 404 de prefijo exactas a los assets,
 * sin afectar el fallback SPA de las rutas de Angular.
 *
 * Es idempotente: si los archivos ya están en /js y /css, no vuelve a mover.
 * Se ejecuta tras el build (script `build:netlify` de package.json).
 */
const fs = require('fs');
const path = require('path');

const base = path.resolve(__dirname, '..', 'dist', 'Frontend-Angular', 'browser');

if (!fs.existsSync(path.join(base, 'index.html'))) {
  console.error('organizar-assets: no existe ' + path.join(base, 'index.html') + '. Verifica el build.');
  process.exit(1);
}

// Mover raíz -> /js y /css
const movidos = [];
for (const entrada of fs.readdirSync(base, { withFileTypes: true })) {
  if (!entrada.isFile() || !/.+\.(js|css)$/.test(entrada.name)) continue;
  const carpeta = entrada.name.endsWith('.js') ? 'js' : 'css';
  const dirDestino = path.join(base, carpeta);
  fs.mkdirSync(dirDestino, { recursive: true });
  fs.renameSync(path.join(base, entrada.name), path.join(dirDestino, entrada.name));
  movidos.push(carpeta + '/' + entrada.name);
}

if (movidos.length === 0) {
  console.log('organizar-assets: nada que mover (ya está organizado).');
  process.exit(0);
}

// Reescribir SOLO index.html: las referencias de los atributos resuelven con
// <base href="/">, así que necesitan el prefijo /js|css. Las importaciones
// estáticas y dinámicas entre bundles NO se reescriben: con el módulo en /js,
// sus rutas relativas ("./chunk-…js") ya resuelven automáticamente en /js.
const html = path.join(base, 'index.html');
let contenido = fs.readFileSync(html, 'utf8');
let reemplazos = 0;
const antes = contenido;
for (const destino of movidos) {
  const nombre = path.basename(destino);
  const prefijo = destino.startsWith('js/') ? 'js/' : 'css/';
  contenido = contenido.split('"' + nombre + '"').join('"' + prefijo + nombre + '"');
}
if (contenido !== antes) {
  fs.writeFileSync(html, contenido);
  reemplazos = 1;
}

console.log('organizar-assets: ' + movidos.length + ' archivos movidos, referencias de index.html reescritas (' + reemplazos + ').');
