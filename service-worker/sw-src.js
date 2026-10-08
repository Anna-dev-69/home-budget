/* global self */

import { clientsClaim } from 'workbox-core';
import { addPlugins, cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

/**
 * One service worker owns the page: Workbox precaches the shell, and the same
 * fetch path attaches COOP/COEP. A second worker cannot share this scope, and
 * GitHub Pages cannot send those headers itself. `credentialless` matches vercel.json.
 * expo-sqlite's synchronous worker bridge needs the resulting SharedArrayBuffer.
 */
const COEP = 'credentialless';
const COOP = 'same-origin';

function withIsolationHeaders(response) {
  if (!response || response.type === 'opaque' || response.status === 0) return response;
  const headers = new Headers(response.headers);
  headers.set('Cross-Origin-Embedder-Policy', COEP);
  headers.set('Cross-Origin-Opener-Policy', COOP);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

addPlugins([
  {
    cachedResponseWillBeUsed: async ({ cachedResponse }) => withIsolationHeaders(cachedResponse),
    fetchDidSucceed: async ({ response }) => withIsolationHeaders(response),
  },
]);

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));
