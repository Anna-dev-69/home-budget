import { spawnSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function normalizeBaseUrl(value) {
  if (!value) return '';
  let base = String(value).trim();
  if (!base || base === '/') return '';
  if (!base.startsWith('/')) base = `/${base}`;
  return base.replace(/\/+$/, '');
}

const base = normalizeBaseUrl(process.env.EXPO_BASE_URL);
const indexPath = join(dist, 'index.html');
const original = readFileSync(indexPath, 'utf8');
if (!original.includes('__APP_BASE_PATH__')) {
  throw new Error('dist/index.html is missing the __APP_BASE_PATH__ placeholder from public/index.html.');
}
const html = original.replaceAll('__APP_BASE_PATH__', base || '/');

writeFileSync(indexPath, html);
// GitHub Pages has no SPA rewrite. A missing path serves this file with status 404.
copyFileSync(indexPath, join(dist, '404.html'));
// Pages' Jekyll step would otherwise drop Expo's `_expo` directory on branch deploys.
writeFileSync(join(dist, '.nojekyll'), '');

if (base) {
  const manifestPath = join(dist, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.start_url = `${base}/`;
  manifest.scope = `${base}/`;
  if (Array.isArray(manifest.icons)) {
    manifest.icons = manifest.icons.map((icon) =>
      typeof icon.src === 'string' && icon.src.startsWith('/') ? { ...icon, src: `${base}${icon.src}` } : icon,
    );
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(`Prepared web dist (base: ${base || '/'}).`);

// workbox-cli injectManifest does not bundle imports. Produce one classic
// worker script, then inject the precache manifest into self.__WB_MANIFEST.
run(join(root, 'node_modules/esbuild/bin/esbuild'), [
  'service-worker/sw-src.js',
  '--bundle',
  '--format=iife',
  '--platform=browser',
  '--target=es2020',
  '--define:process.env.NODE_ENV="production"',
  '--outfile=service-worker/sw.bundled.js',
]);
run(process.execPath, [join(root, 'node_modules/workbox-cli/build/bin.js'), 'injectManifest', 'workbox-config.cjs']);
