const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite runs through WebAssembly in browsers.
config.resolver.assetExts.push('wasm');

module.exports = config;
