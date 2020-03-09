/* eslint-disable import/no-extraneous-dependencies */

const path = require('path');
const WebpackTapeRun = require('webpack-tape-run');

module.exports = {
  target: 'web',
  devtool: 'source-map',
  entry: ['./tests/index.spec.js'],
  node: {
    fs: 'empty'
  },
  output: {
    path: path.resolve(__dirname, './test_dist'),
    filename: 'test.js'
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['*', '.js']
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react']
          }
        }
      },
      {
        test: /\.(glsl|frag|vert)$/,
        use: [require.resolve('raw-loader'), require.resolve('glslify-loader')]
      }
    ]
  },
  plugins: [
    new WebpackTapeRun({
      tapeRun: {
        browser: 'electron'
      },
      reporter: 'tap-spec'
    })
  ]
};
