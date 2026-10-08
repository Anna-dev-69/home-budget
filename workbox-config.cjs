module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{js,html,css,json,wasm,ttf,ico,png}'],
  // The worker script must stay network-fresh so browsers can detect updates.
  globIgnores: ['sw.js', 'workbox-*.js'],
  swSrc: 'service-worker/sw-src.js',
  swDest: 'dist/sw.js',
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
};
