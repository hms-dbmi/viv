const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  devtool: 'source-map',
  entry: './src/index.js',
  output: {
    path: path.join(__dirname, '/dist'),
    filename: 'index_bundle.js'
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
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },
  resolve: {
    fallback: {
      fs: false,
      buffer: false,
      events: false,
      url: false,
      https: false,
      http: false
    },
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      '@deck.gl/core': path.resolve(__dirname, 'node_modules/@deck.gl/core'),
      '@deck.gl/geo-layers': path.resolve(__dirname, 'node_modules/@deck.gl/geo-layers'),
      '@deck.gl/layers': path.resolve(__dirname, 'node_modules/@deck.gl/layers'),
      '@deck.gl/react': path.resolve(__dirname, 'node_modules/@deck.gl/react'),
      '@luma.gl/constants': path.resolve(__dirname, 'node_modules/@luma.gl/constants'),
      '@luma.gl/core': path.resolve(__dirname, 'node_modules/@luma.gl/core'),
      '@luma.gl/shadertools': path.resolve(__dirname, 'node_modules/@luma.gl/shadertools'),
    }
  },
  plugins: [
    new HtmlWebPackPlugin({
      hash: true,
      filename: 'index.html', // target html
      template: './public/index.html' // source html
    }),
    new MiniCssExtractPlugin({ filename: 'css/style.css' })
  ]
};
