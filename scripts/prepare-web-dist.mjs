import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

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
