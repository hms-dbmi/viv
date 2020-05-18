/* eslint-disable global-require, no-dupe-keys */
const path = require('path');
const nodeExternals = require('webpack-node-externals');

const baseConifg = {
  devtool: 'source-map',
  entry: './src/index.js',
  // Bundle geotiff so we can use workers with its code.
  externals: [nodeExternals({ whitelist: 'geotiff' })],
  module: {
    rules: [
      {
        test: /viv\.worker\.js$/,
        use: {
          loader: 'worker-loader',
          options: {
            name: '[hash].decoder.worker.js',
            inline: true,
            fallback: false
          }
        }
      },
      {
        test: /\.(glsl|frag|vert)$/,
        use: [require.resolve('raw-loader'), require.resolve('glslify-loader')]
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  node: {
    fs: 'empty',
    buffer: 'empty',
    http: 'empty'
  }
};

const esConfig = {
  ...baseConifg,
  output: {
    path: path.join(__dirname, '/dist/'),
    filename: 'bundle.es.js',
    libraryTarget: 'commonjs2'
  },
  optimization: {
    minimize: false
  }
};

const umdConfig = {
  ...baseConifg,
  output: {
    path: path.join(__dirname, '/dist/'),
    filename: 'bundle.umd.js',
    libraryTarget: 'umd'
  }
};

module.exports = [esConfig, umdConfig];
