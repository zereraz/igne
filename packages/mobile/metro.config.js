const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add HTML and JS as recognized asset extensions for the editor bundle
config.resolver.assetExts.push('html');

module.exports = config;
