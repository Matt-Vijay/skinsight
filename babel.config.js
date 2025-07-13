module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      ['module-resolver', {
        alias: {
          '@': './src',
          'stream': 'stream-browserify',
          'buffer': 'buffer',
          'process': 'process',
          'events': 'events',
          'url': 'url'
        }
      }]
    ],
  };
};
