/* eslint-disable global-require, no-dupe-keys */
const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  devtool: 'source-map',
  entry: './avivator/src/index.js',
  output: {
    path: path.join(__dirname, '/dist'),
    filename: 'index_bundle.js'
  },
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
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },

          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
              modules: {
                localIdentName: '[local]'
              }
            }
          },

          {
            loader: 'postcss-loader',
            options: {
              plugins: () => [require('autoprefixer')]
            }
          }
        ]
      },
      {
        test: /\.(png|jpg|gif)$/,
        use: [
          {
            loader: 'file-loader'
          }
        ]
      }
    ]
  },
  node: {
    fs: 'empty',
    buffer: 'empty',
    http: 'empty'
  },
  plugins: [
    new HtmlWebPackPlugin({
      hash: true,
      filename: 'index.html', // target html
      template: './avivator/public/index.html' // source html
    }),
    new MiniCssExtractPlugin({ filename: 'css/style.css' })
  ]
};
