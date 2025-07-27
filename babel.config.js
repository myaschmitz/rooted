module.exports = function(api) {
  api.cache(true);
  const isDev = process.env.NODE_ENV !== 'production';
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: isDev ? '.env.development' : '.env.production',
      }]
    ]
  };
};
