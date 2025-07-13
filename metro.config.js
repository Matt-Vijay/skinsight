const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: false, // Disable inline requires to prevent excessive bundling
    },
  }),
};

// Optimize resolver to reduce unnecessary file watching
config.resolver = {
  ...config.resolver,
  assetExts: [...config.resolver.assetExts, 'lottie'],
  platforms: ['ios', 'android', 'native', 'web'],
};

// Optimize watchFolders to only watch necessary directories
config.watchFolders = [__dirname];

module.exports = config;
