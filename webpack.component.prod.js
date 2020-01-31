const path = require("path");
var nodeExternals = require('webpack-node-externals');

module.exports = {
  devtool: 'source-map',
    entry: "./src/index.js",
    output: {
        path: path.join(__dirname, "/dist"),
        filename: 'index.js',
        library: 'vitessce-image-viewer',
        libraryTarget: 'umd'
    },
    externals: [nodeExternals()],
    module: {
        rules: [{
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
            test: /\.(png|jpg|gif)$/,
            use: [
                {
                    loader: 'file-loader'
                }
            ]
        }
        ]
    }
}
