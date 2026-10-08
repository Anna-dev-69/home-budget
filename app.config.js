const appJson = require('./app.json');

/**
 * GitHub Pages publishes this repo at /home-budget/. Vercel stays at the domain
 * root, so the subpath is applied only when EXPO_BASE_URL is set (the Pages workflow).
 */
function normalizeBaseUrl(value) {
  if (!value) return '';
  let base = String(value).trim();
  if (!base || base === '/') return '';
  if (!base.startsWith('/')) base = `/${base}`;
  return base.replace(/\/+$/, '');
}

module.exports = () => {
  const baseUrl = normalizeBaseUrl(process.env.EXPO_BASE_URL);
  const experiments = { ...appJson.expo.experiments };
  if (baseUrl) experiments.baseUrl = baseUrl;

  return {
    expo: {
      ...appJson.expo,
      experiments,
    },
  };
};
