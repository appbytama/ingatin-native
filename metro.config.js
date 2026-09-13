const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// lucide-react-native (and other ESM-only packages) ship a `.mjs` entry
// point via package.json's "exports"/"react-native" condition — Metro's
// resolver finds that mapping but won't actually load a bare `.mjs` file
// unless the extension is in sourceExts, so it falls through to "module
// could not be resolved" instead. Not on by default as of Expo SDK 57.
config.resolver.sourceExts.push('mjs');

module.exports = config;
