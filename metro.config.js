const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.watchFolders = [
  ...(config.watchFolders || []),
  path.join(__dirname, 'frontend'),
];

module.exports = config;
